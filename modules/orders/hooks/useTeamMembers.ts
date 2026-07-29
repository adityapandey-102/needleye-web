"use client";

import { useEffect, useState } from "react";
import type { Role } from "../../../lib/domain";
import { apiFetch } from "../../../lib/api/client";

interface TeamMember {
  id: string;
  fullName: string;
  role: Role;
}

/** Designer/master-tailor lookups backing selects and filters -- replaces the prototype's hardcoded 5-name lists. */
export function useTeamMembers(role: Extract<Role, "designer" | "master_tailor">) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/team-members?role=${role}`);
        if (!cancelled) {
          setMembers(data.members);
          setError(null);
        }
      } catch (err) {
        // Must catch here: a network blip (API redeploy, mobile Wi-Fi drop)
        // otherwise escapes this async effect as an unhandled rejection.
        // Degrade to an empty list + an error the caller can surface.
        if (!cancelled) {
          setMembers([]);
          setError(err instanceof Error ? err.message : "Failed to load team members");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role]);

  return { members, loading, error };
}
