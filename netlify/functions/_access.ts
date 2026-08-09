import type { Client } from '@libsql/client/web';

export type SessionUser = {
  userId: string;
  email: string;
};

let hasEnsuredAccessTable = false;

const getAdminEmails = () => {
  return (process.env.AUTH_ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
};

export const hasAdminConfig = () => getAdminEmails().length > 0;

export const isAdmin = (session: SessionUser) => {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return false;

  const email = session.email.toLowerCase();
  const domain = email.split('@')[1];

  return adminEmails.some((entry) => {
    if (entry === email) return true;
    if (entry.startsWith('@')) return email.endsWith(entry);
    return domain && entry === domain;
  });
};

export const ensureTeamAccessTable = async (client: Client) => {
  if (hasEnsuredAccessTable) return;

  await client.execute(`
    create table if not exists team_access (
      id text primary key,
      team_id text not null references teams(id),
      user_id text not null references users(id),
      role text not null,
      created_at text not null,
      updated_at text not null,
      metadata text,
      unique(team_id, user_id)
    )
  `);
  await client.execute('create index if not exists idx_team_access_user_id on team_access(user_id)');
  await client.execute('create index if not exists idx_team_access_team_id on team_access(team_id)');

  hasEnsuredAccessTable = true;
};

export const hasProgramAccess = async (client: Client, session: SessionUser) => {
  if (isAdmin(session)) return true;
  await ensureTeamAccessTable(client);

  const owned = await client.execute({
    sql: 'select id from teams where owner_id = ? limit 1',
    args: [session.userId],
  });
  if (owned.rows.length > 0) return true;

  const assigned = await client.execute({
    sql: 'select id from team_access where user_id = ? limit 1',
    args: [session.userId],
  });

  return assigned.rows.length > 0;
};

export const canViewProgram = hasProgramAccess;

export const canCreateTeam = (session: SessionUser) => {
  return isAdmin(session) || !hasAdminConfig();
};

export const canManageTeam = async (client: Client, session: SessionUser, teamId: string) => {
  if (isAdmin(session)) return true;
  await ensureTeamAccessTable(client);

  const owned = await client.execute({
    sql: 'select id from teams where id = ? and owner_id = ? limit 1',
    args: [teamId, session.userId],
  });
  if (owned.rows.length > 0) return true;

  const assigned = await client.execute({
    sql: `select id from team_access
      where team_id = ? and user_id = ? and role = 'coach'
      limit 1`,
    args: [teamId, session.userId],
  });

  return assigned.rows.length > 0;
};

export const canManageMatch = async (client: Client, session: SessionUser, matchId: string) => {
  if (isAdmin(session)) return true;
  await ensureTeamAccessTable(client);

  const owned = await client.execute({
    sql: `select matches.id
      from matches
      inner join teams on teams.id = matches.team_id
      where matches.id = ? and teams.owner_id = ?
      limit 1`,
    args: [matchId, session.userId],
  });
  if (owned.rows.length > 0) return true;

  const assigned = await client.execute({
    sql: `select matches.id
      from matches
      inner join team_access on team_access.team_id = matches.team_id
      where matches.id = ? and team_access.user_id = ? and team_access.role = 'coach'
      limit 1`,
    args: [matchId, session.userId],
  });

  return assigned.rows.length > 0;
};

export const canCoachMatchTeam = async (client: Client, session: SessionUser, matchId: string, teamId: string) => {
  if (!await canManageTeam(client, session, teamId)) return false;

  const result = await client.execute({
    sql: 'select id from matches where id = ? and team_id = ? limit 1',
    args: [matchId, teamId],
  });

  return result.rows.length > 0;
};

export const canManageSet = async (client: Client, session: SessionUser, setId: string, matchId: string) => {
  if (!await canManageMatch(client, session, matchId)) return false;

  const result = await client.execute({
    sql: 'select id from sets where id = ? and match_id = ? limit 1',
    args: [setId, matchId],
  });

  return result.rows.length > 0;
};

export const canManagePlayer = async (client: Client, session: SessionUser, playerId: string) => {
  if (isAdmin(session)) return true;
  await ensureTeamAccessTable(client);

  const owned = await client.execute({
    sql: `select players.id
      from players
      inner join teams on teams.id = players.team_id
      where players.id = ? and teams.owner_id = ?
      limit 1`,
    args: [playerId, session.userId],
  });
  if (owned.rows.length > 0) return true;

  const assigned = await client.execute({
    sql: `select players.id
      from players
      inner join team_access on team_access.team_id = players.team_id
      where players.id = ? and team_access.user_id = ? and team_access.role = 'coach'
      limit 1`,
    args: [playerId, session.userId],
  });

  return assigned.rows.length > 0;
};

export const canViewMatch = async (client: Client, session: SessionUser, matchId: string) => {
  if (!await canViewProgram(client, session)) return false;

  const result = await client.execute({
    sql: 'select id from matches where id = ? limit 1',
    args: [matchId],
  });

  return result.rows.length > 0;
};
