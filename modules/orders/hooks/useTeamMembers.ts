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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/team-members?role=${role}`);
        if (!cancelled) setMembers(data.members);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role]);

  return { members, loading };
}
