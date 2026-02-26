import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useCometChat } from "@/components/modules/telehealth/shared/cometchat";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, MessageSquare } from "lucide-react";
import {
  CometChatConversations,
  CometChatMessageComposer,
  CometChatMessageHeader,
  CometChatMessageList,
} from "@cometchat/chat-uikit-react";
import type { Conversation, Group, User } from "@cometchat/chat-sdk-javascript";

type ChatTarget =
  | { type: "user"; withObj: User }
  | { type: "group"; withObj: Group };

export default function PatientMessagesPage() {
  const navigate = useNavigate();
  const { isLoading: userLoading } = useCurrentUser();
  const { isInitialized, isLoggedIn, error } = useCometChat();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const activeChat = useMemo<ChatTarget | null>(() => {
    if (!activeConversation) return null;
    const type = activeConversation.getConversationType?.() as ChatTarget["type"] | undefined;
    const withObj = activeConversation.getConversationWith?.() as
      | User
      | Group
      | undefined;
    if (!type || !withObj) return null;
    if (type === "user") return { type, withObj: withObj as User };
    if (type === "group") return { type, withObj: withObj as Group };
    return null;
  }, [activeConversation]);

  if (userLoading) {
    return <FullPageSpinner />;
  }

  const pageHeader = (
    <div className="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Chat with your care team</p>
      </div>
    </div>
  );

  if (!isInitialized) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {pageHeader}
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">
              <p>Initializing chat...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {pageHeader}
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive mb-4">Failed to initialize chat</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {pageHeader}
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">
              <p>Connecting to chat service...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {pageHeader}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex h-[650px]">
            {/* Conversations (patients cannot initiate new chats) */}
            <div className="w-80 border-r">
              <CometChatConversations
                headerView={
                  <div className="p-4 border-b">
                    <p className="text-sm font-semibold">Inbox</p>
                    <p className="text-xs text-muted-foreground">
                      Providers will message you here
                    </p>
                  </div>
                }
                activeConversation={activeConversation ?? undefined}
                onItemClick={(conversation: Conversation) => setActiveConversation(conversation)}
              />
            </div>

            {/* Messages */}
            <div className="flex-1 flex flex-col">
              {activeChat?.withObj ? (
                <>
                  <CometChatMessageHeader
                    user={activeChat.type === "user" ? activeChat.withObj : undefined}
                    group={activeChat.type === "group" ? activeChat.withObj : undefined}
                    hideVoiceCallButton
                    hideVideoCallButton
                  />
                  <div className="flex-1 overflow-auto">
                    <CometChatMessageList
                      user={activeChat.type === "user" ? activeChat.withObj : undefined}
                      group={activeChat.type === "group" ? activeChat.withObj : undefined}
                    />
                  </div>
                  <CometChatMessageComposer
                    user={activeChat.type === "user" ? activeChat.withObj : undefined}
                    group={activeChat.type === "group" ? activeChat.withObj : undefined}
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No conversation selected</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a conversation to view messages
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
