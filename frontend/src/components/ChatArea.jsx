import React, { useEffect } from 'react';
import Nav from './Nav';
import MessageList from './MessageList';
import Chatinput from './Chatinput';
import { useDispatch, useSelector } from 'react-redux';
import getMessages from '../features/getMessages';
import { setActiveConversationId, setArtifacts, setMessages } from '../redux/messageSlice';

/**
 * ============================================================================
 * CHAT AREA COMPONENT (`ChatArea.jsx`)
 * ============================================================================
 * Main conversational pane:
 * - Hosts top Navigation bar, scrollable MessageList, and bottom ChatInput bar.
 * - Synchronizes message history and active artifacts on thread selection changes.
 * ============================================================================
 */
function ChatArea() {
  const { selectedConversation } = useSelector(state => state.conversation);
  const dispatch = useDispatch();

  useEffect(() => {
    const convId = selectedConversation?._id || null;
    dispatch(setActiveConversationId(convId));

    const getMesg = async () => {
      // Clear previous messages and artifacts immediately to prevent UI flashes
      dispatch(setMessages([]));
      dispatch(setArtifacts([]));

      if (!selectedConversation) return;

      // "New Chat" has no messages yet
      if (selectedConversation.title === "New Chat") return;

      const data = await getMessages(selectedConversation._id);
      if (!Array.isArray(data)) return;

      dispatch(setMessages(data));

      // Extract latest artifact from messages safely
      const latestArtifactMessage = [...data]
        .reverse()
        .find(msg => msg.artifacts && msg.artifacts.length > 0);

      dispatch(setArtifacts(latestArtifactMessage?.artifacts || []));
    };

    getMesg();
  }, [selectedConversation?._id]);

  return (
    <div className='flex-1 flex flex-col min-w-0' style={{ background: "#f9f8f6" }}>
      <Nav />
      <MessageList />
      <Chatinput />
    </div>
  );
}

export default ChatArea;
