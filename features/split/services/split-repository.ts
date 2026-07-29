import { supabase } from '@/lib/supabase';
import { generateId } from '@/lib/id';
import type {
  ExpenseShare,
  ExpenseGroup,
  GroupActivity,
  GroupExpense,
  GroupKind,
  GroupMember,
  Settlement,
} from '@/features/split/types/split.types';

/**
 * Supabase access for shared expense groups.
 *
 * Unlike every other repository in the app this does NOT read SQLite: group
 * data is shared, so the server is the source of truth and react-query holds
 * the cache. Reads rely on the RLS policies from 0003 — there is no explicit
 * "where I am a member" clause because the database already refuses to return
 * anything else.
 *
 * Writes that touch more than one table go through the RPCs in 0004 so they
 * land atomically.
 */

// --- row mapping -----------------------------------------------------------

type Row = Record<string, unknown>;

const num = (v: unknown, fallback = 0) => (typeof v === 'number' ? v : fallback);
const str = (v: unknown) => (typeof v === 'string' ? v : null);

const toGroup = (r: Row): ExpenseGroup => ({
  id: String(r.id),
  name: String(r.name),
  kind: (str(r.kind) ?? 'other') as GroupKind,
  currency: str(r.currency) ?? 'USD',
  createdBy: str(r.created_by),
  createdAt: num(r.created_at),
  updatedAt: num(r.updated_at),
});

const toMember = (r: Row): GroupMember => ({
  id: String(r.id),
  groupId: String(r.group_id),
  userId: str(r.user_id),
  email: str(r.email),
  displayName: str(r.display_name),
  role: (str(r.role) ?? 'member') as GroupMember['role'],
  joinedAt: typeof r.joined_at === 'number' ? r.joined_at : null,
});

const toExpense = (r: Row): GroupExpense => ({
  id: String(r.id),
  groupId: String(r.group_id),
  paidByMemberId: String(r.paid_by_member_id),
  description: String(r.description),
  amountCents: num(r.amount_cents),
  currency: str(r.currency) ?? 'USD',
  spentAt: num(r.spent_at),
  note: str(r.note),
  createdBy: str(r.created_by),
  createdAt: num(r.created_at),
  updatedAt: num(r.updated_at),
});

const toShare = (r: Row): ExpenseShare => ({
  id: String(r.id),
  expenseId: String(r.expense_id),
  memberId: String(r.member_id),
  shareCents: num(r.share_cents),
});

const toSettlement = (r: Row): Settlement => ({
  id: String(r.id),
  groupId: String(r.group_id),
  fromMemberId: String(r.from_member_id),
  toMemberId: String(r.to_member_id),
  amountCents: num(r.amount_cents),
  currency: str(r.currency) ?? 'USD',
  settledAt: num(r.settled_at),
  note: str(r.note),
  createdBy: str(r.created_by),
});

const toActivity = (r: Row): GroupActivity => ({
  id: String(r.id),
  groupId: String(r.group_id),
  actorId: str(r.actor_id),
  actorName: str(r.actor_name),
  action: String(r.action) as GroupActivity['action'],
  expenseId: str(r.expense_id),
  settlementId: str(r.settlement_id),
  meta: (r.meta as Record<string, unknown> | null) ?? null,
  createdAt: num(r.created_at),
});

/** Supabase returns `{ data, error }`; make the error a throw so react-query
 *  surfaces it instead of silently rendering an empty list. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

// --- reads -----------------------------------------------------------------

export async function listGroups(): Promise<ExpenseGroup[]> {
  const res = await supabase
    .from('expense_groups')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  return unwrap<Row[]>(res).map(toGroup);
}

export async function getGroup(id: string): Promise<ExpenseGroup | null> {
  const res = await supabase
    .from('expense_groups')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data ? toGroup(res.data as Row) : null;
}

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  const res = await supabase
    .from('expense_group_members')
    .select('*')
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('created_at');
  return unwrap<Row[]>(res).map(toMember);
}

export async function listExpenses(groupId: string): Promise<GroupExpense[]> {
  const res = await supabase
    .from('expense_group_expenses')
    .select('*')
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('spent_at', { ascending: false });
  return unwrap<Row[]>(res).map(toExpense);
}

/** Shares for a whole group. Fetched by expense id because shares carry no
 *  group_id of their own — they belong to the expense, not the group. */
export async function listShares(expenseIds: string[]): Promise<ExpenseShare[]> {
  if (expenseIds.length === 0) return [];
  const res = await supabase.from('expense_group_shares').select('*').in('expense_id', expenseIds);
  return unwrap<Row[]>(res).map(toShare);
}

export async function listSettlements(groupId: string): Promise<Settlement[]> {
  const res = await supabase
    .from('expense_group_settlements')
    .select('*')
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('settled_at', { ascending: false });
  return unwrap<Row[]>(res).map(toSettlement);
}

export async function listActivity(groupId: string, limit = 50): Promise<GroupActivity[]> {
  const res = await supabase
    .from('expense_group_activity')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return unwrap<Row[]>(res).map(toActivity);
}

// --- writes ----------------------------------------------------------------

export async function createGroup(input: {
  name: string;
  kind: GroupKind;
  currency: string;
  displayName: string | null;
}): Promise<string> {
  const groupId = generateId();
  const { error } = await supabase.rpc('create_expense_group', {
    p_group_id: groupId,
    p_name: input.name,
    p_kind: input.kind,
    p_currency: input.currency,
    p_member_id: generateId(),
    p_display_name: input.displayName,
    p_activity_id: generateId(),
    p_now: Date.now(),
  });
  if (error) throw new Error(error.message);
  return groupId;
}

/** Adds somebody by email. They become a member immediately — splittable
 *  straight away — and user_id is filled in when they accept the invitation. */
export async function addMemberByEmail(input: {
  groupId: string;
  email: string;
  displayName: string | null;
}): Promise<void> {
  const now = Date.now();
  const { error } = await supabase.from('expense_group_members').insert({
    id: generateId(),
    group_id: input.groupId,
    user_id: null,
    email: input.email.trim().toLowerCase(),
    display_name: input.displayName,
    role: 'member',
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('expense_group_members')
    .update({ deleted_at: Date.now(), updated_at: Date.now() })
    .eq('id', memberId);
  if (error) throw new Error(error.message);
}

export async function createExpense(input: {
  groupId: string;
  paidByMemberId: string;
  description: string;
  amountCents: number;
  currency: string;
  spentAt: number;
  note: string | null;
  shares: { memberId: string; shareCents: number }[];
}): Promise<string> {
  const expenseId = generateId();
  const { error } = await supabase.rpc('create_group_expense', {
    p_expense_id: expenseId,
    p_group_id: input.groupId,
    p_paid_by_member_id: input.paidByMemberId,
    p_description: input.description,
    p_amount_cents: input.amountCents,
    p_currency: input.currency,
    p_spent_at: input.spentAt,
    p_note: input.note,
    p_shares: input.shares.map((s) => ({ member_id: s.memberId, share_cents: s.shareCents })),
    p_activity_id: generateId(),
    p_now: Date.now(),
  });
  if (error) throw new Error(error.message);
  return expenseId;
}

export async function updateExpense(input: {
  expenseId: string;
  paidByMemberId: string;
  description: string;
  amountCents: number;
  spentAt: number;
  note: string | null;
  shares: { memberId: string; shareCents: number }[];
}): Promise<void> {
  const { error } = await supabase.rpc('update_group_expense', {
    p_expense_id: input.expenseId,
    p_description: input.description,
    p_amount_cents: input.amountCents,
    p_paid_by_member_id: input.paidByMemberId,
    p_spent_at: input.spentAt,
    p_note: input.note,
    p_shares: input.shares.map((s) => ({ member_id: s.memberId, share_cents: s.shareCents })),
    p_activity_id: generateId(),
    p_now: Date.now(),
  });
  if (error) throw new Error(error.message);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_group_expense', {
    p_expense_id: expenseId,
    p_activity_id: generateId(),
    p_now: Date.now(),
  });
  if (error) throw new Error(error.message);
}

export async function recordSettlement(input: {
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
  currency: string;
  note: string | null;
}): Promise<void> {
  const now = Date.now();
  const { error } = await supabase.rpc('record_settlement', {
    p_settlement_id: generateId(),
    p_group_id: input.groupId,
    p_from_member_id: input.fromMemberId,
    p_to_member_id: input.toMemberId,
    p_amount_cents: input.amountCents,
    p_currency: input.currency,
    p_settled_at: now,
    p_note: input.note,
    p_activity_id: generateId(),
    p_now: now,
  });
  if (error) throw new Error(error.message);
}
