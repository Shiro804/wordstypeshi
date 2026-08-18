import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { FlimmerAction, FlimmerSession } from "@/lib/games/batasflimmer/types";

export const FLIMMER_CHANNEL = "batasflimmer-pair";

export type FlimmerWire =
  | { kind: "invite"; from: string; to: string; at: number }
  | { kind: "cancel"; from: string; to: string }
  | { kind: "accept"; from: string; to: string }
  | { kind: "decline"; from: string; to: string }
  | { kind: "action"; from: string; action: FlimmerAction }
  | { kind: "state"; from: string; state: FlimmerSession };

type Handlers = {
  username: string;
  onInvite?: (from: string) => void;
  onCancel?: (from: string) => void;
  onAccept?: (from: string) => void;
  onDecline?: (from: string) => void;
  onAction?: (from: string, action: FlimmerAction) => void;
  onState?: (state: FlimmerSession) => void;
  onPresence?: (online: string[]) => void;
};

export function connectFlimmerChannel(handlers: Handlers): {
  channel: RealtimeChannel;
  send: (payload: FlimmerWire) => Promise<void>;
  leave: () => Promise<void>;
} {
  const supabase = createClient();
  const channel = supabase.channel(FLIMMER_CHANNEL, {
    config: { presence: { key: handlers.username } },
  });

  const send = async (payload: FlimmerWire) => {
    await channel.send({ type: "broadcast", event: "flimmer", payload });
  };

  channel
    .on("broadcast", { event: "flimmer" }, ({ payload }) => {
      const msg = payload as FlimmerWire;
      if (!msg?.kind) return;
      if (msg.kind === "invite" && msg.to === handlers.username) {
        handlers.onInvite?.(msg.from);
      }
      if (msg.kind === "cancel" && msg.to === handlers.username) {
        handlers.onCancel?.(msg.from);
      }
      if (msg.kind === "accept" && msg.to === handlers.username) {
        handlers.onAccept?.(msg.from);
      }
      if (msg.kind === "decline" && msg.to === handlers.username) {
        handlers.onDecline?.(msg.from);
      }
      if (msg.kind === "action" && msg.from !== handlers.username) {
        handlers.onAction?.(msg.from, msg.action);
      }
      if (msg.kind === "state" && msg.from !== handlers.username) {
        handlers.onState?.(msg.state);
      }
    })
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      handlers.onPresence?.(Object.keys(state));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ username: handlers.username, at: Date.now() });
      }
    });

  return {
    channel,
    send,
    leave: async () => {
      await supabase.removeChannel(channel);
    },
  };
}
