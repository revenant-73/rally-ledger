import React, { useMemo, useState } from 'react';
import { ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useMatch } from '../../hooks/useMatch';
import type { TeamAccessAssignment } from '../../types';
import { useAccess, useGrantAccess, useRevokeAccess } from '../../hooks/queries/useAccess';

const CoachAccessPanel: React.FC = () => {
  const { user } = useAuth();
  const { teams: matchTeams } = useMatch();
  const [coachEmail, setCoachEmail] = useState('');
  const [teamId, setTeamId] = useState('');
  const accessQuery = useAccess(user?.id);

  const access = accessQuery.data ?? null;
  const teams = useMemo(() => access?.teams.length ? access.teams : matchTeams, [access, matchTeams]);
  const selectedTeamId = teamId || teams[0]?.id || '';

  const grantMutation = useGrantAccess(user?.id);
  const revokeMutation = useRevokeAccess(user?.id);

  const handleGrantSuccess = () => {
      setCoachEmail('');
      toast.success('Coach access saved');
  };

  const handleMutationError = (error: Error, fallback: string) => {
    toast.error(error instanceof Error ? error.message : fallback);
  };

  const handleRevokeSuccess = () => {
      toast.success('Coach access removed');
  };

  const isSaving = grantMutation.isPending || revokeMutation.isPending;

  if (accessQuery.isLoading && !access) {
    return null;
  }

  if (!access?.isAdmin) {
    return null;
  }

  const handleGrant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!coachEmail || !selectedTeamId) return;
    grantMutation.mutate(
      { coachEmail, teamId: selectedTeamId },
      {
        onSuccess: handleGrantSuccess,
        onError: (error) => handleMutationError(error, 'Unable to save coach access'),
      },
    );
  };

  const handleRevoke = async (assignment: TeamAccessAssignment) => {
    revokeMutation.mutate(assignment, {
      onSuccess: handleRevokeSuccess,
      onError: (error) => handleMutationError(error, 'Unable to remove coach access'),
    });
  };

  return (
    <section>
      <h3 className="text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-4 ml-2">Coach Access</h3>
      <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-bold">Team Permissions</p>
              <p className="text-xs text-brand-text-secondary leading-relaxed mt-1">
                Coaches can edit only assigned rosters, while still viewing every roster and report.
              </p>
            </div>
          </div>

          <form onSubmit={handleGrant} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="coach-email" className="text-xs font-bold text-brand-text-secondary uppercase">
                Coach Email
              </label>
              <input
                id="coach-email"
                type="email"
                required
                value={coachEmail}
                onChange={(event) => setCoachEmail(event.target.value)}
                placeholder="coach@school.org"
                className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-3 focus:outline-none focus:border-brand-teal"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="coach-team" className="text-xs font-bold text-brand-text-secondary uppercase">
                Assigned Roster
              </label>
              <select
                id="coach-team"
                required
                value={selectedTeamId}
                onChange={(event) => setTeamId(event.target.value)}
                className="w-full bg-brand-bg border border-brand-gray/20 rounded-xl p-3 focus:outline-none focus:border-brand-teal"
              >
                <option value="">Select a roster...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id} className="bg-brand-bg">
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSaving || teams.length === 0}
              className="w-full bg-brand-teal text-brand-bg font-bold py-4 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserPlus size={20} />
              Assign Coach
            </button>
          </form>
        </div>

        <div className="h-px bg-brand-gray/10 mx-6" />

        <div className="p-6 space-y-3">
          <p className="text-xs font-black text-brand-text-secondary uppercase tracking-widest">Current Assignments</p>
          {access.assignments.length === 0 ? (
            <p className="text-sm text-brand-text-secondary">No coach assignments yet.</p>
          ) : (
            access.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-3 bg-brand-bg border border-brand-gray/10 rounded-2xl p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold truncate">{assignment.email}</p>
                  <p className="text-xs text-brand-text-secondary">
                    {assignment.teamName}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleRevoke(assignment)}
                  className="text-brand-gray hover:text-brand-red p-2 transition-colors disabled:opacity-50"
                  aria-label={`Remove ${assignment.email} from ${assignment.teamName}`}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default CoachAccessPanel;
