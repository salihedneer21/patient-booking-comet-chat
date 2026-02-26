import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CometChatCalls } from "@cometchat/calls-sdk-javascript";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoCallRoomProps {
  sessionId: string;
  onCallEnded: () => void;
}

type OngoingCallListener = InstanceType<typeof CometChatCalls.OngoingCallListener>;

type BuilderWithCallListener = {
  setCallListener: (listener: OngoingCallListener) => unknown;
};

type BuilderWithCallEventListener = {
  setCallEventListener: (listener: OngoingCallListener) => unknown;
};

export function VideoCallRoom({ sessionId, onCallEnded }: VideoCallRoomProps) {
  const callContainerRef = useRef<HTMLDivElement>(null);
  const callStartedRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "inCall" | "error">("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    // Clean up any previous session then re-run effect.
    try {
      CometChatCalls.endSession();
    } catch {
      // ignore
    }
    callStartedRef.current = false;
    setRetryKey((k) => k + 1);
  }, []);

  const diagnosticHint = useMemo(() => {
    return "Check camera/mic permissions and ensure CometChat Calls SDK is configured.";
  }, []);

  useEffect(() => {
    if (!sessionId || !callContainerRef.current || callStartedRef.current) return;

    let isMounted = true;

    const startCall = async () => {
      try {
        setStatus("starting");
        setErrorMessage(null);

        // Get current logged-in user
        const user = await CometChat.getLoggedinUser();
        if (!user || !isMounted) return;

        // Generate call token for this session
        const authToken = user.getAuthToken();
        const { token: callToken } = await CometChatCalls.generateToken(
          sessionId,
          authToken,
        );

        if (!isMounted) return;

        callStartedRef.current = true;

        // Build call settings
        const listener = new CometChatCalls.OngoingCallListener({
          onCallEnded: () => {
            if (isMounted) onCallEnded();
          },
          onCallEndButtonPressed: () => {
            if (isMounted) onCallEnded();
          },
          onUserJoined: (joinedUser) => {
            console.log("User joined:", joinedUser);
          },
          onUserLeft: (leftUser) => {
            console.log("User left:", leftUser);
          },
          onError: (error) => {
            console.error("Call error:", error);
          },
        });

        const builder = new CometChatCalls.CallSettingsBuilder()
          .enableDefaultLayout(true)
          .setIsAudioOnlyCall(false);

        // Calls SDK method name differs across versions.
        const maybeBuilder: unknown = builder;
        if (
          typeof (maybeBuilder as Partial<BuilderWithCallListener>).setCallListener ===
          "function"
        ) {
          (maybeBuilder as BuilderWithCallListener).setCallListener(listener);
        } else if (
          typeof (maybeBuilder as Partial<BuilderWithCallEventListener>)
            .setCallEventListener === "function"
        ) {
          (maybeBuilder as BuilderWithCallEventListener).setCallEventListener(listener);
        } else {
          throw new Error(
            "Unsupported CometChat Calls SDK: missing call listener method.",
          );
        }

        const callSettings = builder.build();

        // Start the call session
        await CometChatCalls.startSession(
          callToken,
          callSettings,
          callContainerRef.current!
        );
        if (isMounted) setStatus("inCall");
      } catch (error) {
        console.error("Failed to start call:", error);
        callStartedRef.current = false;
        if (isMounted) {
          setStatus("error");
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to start call.",
          );
        }
      }
    };

    startCall();

    return () => {
      isMounted = false;
      // End the call session when unmounting
      if (callStartedRef.current) {
        CometChatCalls.endSession();
        callStartedRef.current = false;
      }
    };
  }, [retryKey, sessionId, onCallEnded]);

  return (
    <div className="relative h-full w-full" style={{ minHeight: "400px" }}>
      <div ref={callContainerRef} className="h-full w-full" />

      {status === "starting" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border bg-background/80 backdrop-blur px-4 py-3 text-sm text-muted-foreground">
            Starting video session…
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium">Unable to start video session</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage || diagnosticHint}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={retry}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
