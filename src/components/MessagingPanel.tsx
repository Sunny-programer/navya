import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { supabase, Message, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function MessagingPanel() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<{ profile: Profile; lastMessage: Message }[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user?.id}`
          },
          () => {
            loadMessages(selectedConversation);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedConversation]);

  async function loadConversations() {
    const { data: sentMessages } = await supabase
      .from('messages')
      .select('*, recipient:profiles!messages_recipient_id_fkey(*)')
      .eq('sender_id', user?.id)
      .order('created_at', { ascending: false });

    const { data: receivedMessages } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .eq('recipient_id', user?.id)
      .order('created_at', { ascending: false });

    const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];
    const uniqueProfiles = new Map<string, { profile: Profile; lastMessage: Message }>();

    allMessages.forEach(msg => {
      const otherUserId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
      const otherProfile = msg.sender_id === user?.id ? msg.recipient : msg.sender;

      if (!uniqueProfiles.has(otherUserId)) {
        uniqueProfiles.set(otherUserId, {
          profile: otherProfile,
          lastMessage: msg,
        });
      }
    });

    setConversations(Array.from(uniqueProfiles.values()));
  }

  async function loadMessages(otherUserId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user?.id})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('recipient_id', user?.id)
      .eq('sender_id', otherUserId)
      .eq('is_read', false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    await supabase.from('messages').insert({
      sender_id: user?.id,
      recipient_id: selectedConversation,
      content: newMessage,
    });

    setNewMessage('');
    loadMessages(selectedConversation);
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-[600px]">
      <div className="border-r border-gray-200 overflow-y-auto">
        <h3 className="font-semibold mb-4">Conversations</h3>
        {conversations.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet</p>
        ) : (
          <div className="space-y-2">
            {conversations.map(({ profile, lastMessage }) => (
              <button
                key={profile.id}
                onClick={() => setSelectedConversation(profile.id)}
                className={`w-full text-left p-3 rounded-lg transition ${
                  selectedConversation === profile.id
                    ? 'bg-green-50 border border-green-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <p className="font-medium">{profile.full_name}</p>
                <p className="text-sm text-gray-600 truncate">{lastMessage.content}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="col-span-2 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.sender_id === user?.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender_id === user?.id ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
