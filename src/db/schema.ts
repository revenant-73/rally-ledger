import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  level: text('level').notNull(),
  season: text('season').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  jerseyNumber: text('jersey_number').notNull(),
  position: text('position').notNull(), // PlayerPosition
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  photoUrl: text('photo_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  opponentName: text('opponent_name').notNull(),
  matchDate: text('match_date').notNull(),
  location: text('location').notNull(),
  matchType: text('match_type').notNull(),
  result: text('result'), // 'Win' | 'Loss'
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sets = sqliteTable('sets', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id),
  setNumber: integer('set_number').notNull(),
  ourScore: integer('our_score').notNull().default(0),
  opponentScore: integer('opponent_score').notNull().default(0),
  startingServerTeam: text('starting_server_team').notNull(), // 'Us' | 'Opponent'
  finalResult: text('final_result'), // 'Win' | 'Loss'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const rallyEvents = sqliteTable('rally_events', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id),
  setId: text('set_id').notNull().references(() => sets.id),
  rallyNumber: integer('rally_number').notNull(),
  scoreBeforeUs: integer('score_before_us').notNull(),
  scoreBeforeOpponent: integer('score_before_opponent').notNull(),
  scoreAfterUs: integer('score_after_us').notNull(),
  scoreAfterOpponent: integer('score_after_opponent').notNull(),
  pointWinner: text('point_winner').notNull(), // 'Us' | 'Opponent'
  servingTeam: text('serving_team').notNull(), // 'Us' | 'Opponent'
  serverPlayerId: text('server_player_id'),
  rotationNumber: integer('rotation_number'),
  outcomeType: text('outcome_type').notNull(), // OutcomeType
  classification: text('classification').notNull(), // Classification
  playerId: text('player_id').references(() => players.id),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});
