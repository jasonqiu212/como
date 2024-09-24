import { Group, Stack } from '@mantine/core';
import '@mantine/core/styles.css';
import { useThrottledState } from '@mantine/hooks';
import { useContext, useEffect, useMemo, useState } from 'react';

import { ProblemStatementContext } from '../App';
import ChatHistory from '../components/ChatHistory';
import ChatInput from '../components/ChatInput';
import Sidebar from '../components/sidebar/Sidebar';
import { HaveAnotLanggraph } from '../llm/Langgraph';

export interface Message {
  role: 'Human' | 'AI';
  text: string;
}

function Chatbot() {
  const [initProblemStatement, _] = useContext(ProblemStatementContext);

  // streamedMessage, streamedProblem, streamedFeatures, streamedProducts are set by HaveAnotLanggraph
  // useEffect is used to then stream their values into messages, problem, features, products respectively
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamedMessage, setStreamedMessage] = useThrottledState<
    string | undefined
  >(undefined, 20);
  const [streamingMessageInterval, setStreamingMessageInterval] = useState<
    NodeJS.Timeout | undefined
  >();

  const [problem, setProblem] = useState<string | undefined>();
  const [streamedProblem, setStreamedProblem] = useThrottledState<
    string | undefined
  >(undefined, 20);
  const [streamingProblemInterval, setStreamingProblemInterval] = useState<
    NodeJS.Timeout | undefined
  >();

  const [features, setFeatures] = useState<string | undefined>();
  const [streamedFeatures, setStreamedFeatures] = useThrottledState<
    string | undefined
  >(undefined, 20);
  const [streamingFeaturesInterval, setStreamingFeaturesInterval] = useState<
    NodeJS.Timeout | undefined
  >();

  // TODO: this needs to be a list of products
  const [products, setProducts] = useState<string | undefined>();
  const [streamedProducts, setStreamedProducts] = useThrottledState<
    string | undefined
  >(undefined, 20);

  const [inputValue, setInputValue] = useState('');
  const [isChatAgentLoading, setIsChatAgentLoading] = useState(false);
  const [isProblemAgentLoading, setIsProblemAgentLoading] = useState(false);
  const [isFeaturesAgentLoading, setIsFeaturesAgentLoading] = useState(false);
  const [isProductsAgentLoading, setIsProductsAgentLoading] = useState(false);

  const getDisplayedResponses = () => {
    return {
      problem: streamedProblem ?? problem,
      features: streamedFeatures ?? features,
      products: streamedProducts ?? products,
    };
  };

  const graph = useMemo(
    () =>
      new HaveAnotLanggraph(
        setStreamedMessage,
        setStreamedProblem,
        setStreamedFeatures,
        setStreamedProducts,
      ),
    [],
  );

  const handleSubmit = async (message: string = inputValue) => {
    const hasLoadingAgent =
      isChatAgentLoading ||
      isProblemAgentLoading ||
      isFeaturesAgentLoading ||
      isProductsAgentLoading;

    if (!hasLoadingAgent) {
      setInputValue('');
      setIsChatAgentLoading(true);
      setIsProblemAgentLoading(true);
      setIsFeaturesAgentLoading(true);
      setIsProductsAgentLoading(true);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'Human', text: message },
      ]);

      // currently only supports one thread
      await graph.invoke(message, getDisplayedResponses(), {
        configurable: { thread_id: 1 },
      });
    }
  };

  // submits the problem statement (set in the context from homepage) as the first message from the user
  useEffect(() => {
    if (initProblemStatement !== null) {
      handleSubmit(initProblemStatement);
    }
  }, []);

  // Streaming effect for chat message
  useEffect(() => {
    if (streamedMessage === undefined) {
      return;
    }

    if (streamingMessageInterval) {
      clearInterval(streamingMessageInterval);
      setStreamingMessageInterval(undefined);
      setMessages((prevMessages) =>
        prevMessages.slice(0, prevMessages.length - 1),
      );
    }

    setMessages((prevMessages) => [...prevMessages, { role: 'AI', text: '' }]);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= streamedMessage.length) {
        clearInterval(interval);
        setStreamingMessageInterval(undefined);
        setStreamedMessage(undefined);
        setIsChatAgentLoading(false);
        return;
      }

      setMessages((prevMessages) => {
        const messages = [...prevMessages];
        messages[messages.length - 1] = {
          role: 'AI',
          text: streamedMessage.slice(0, i + 1),
        };
        return messages;
      });
      i++;
    }, 10);

    setStreamingMessageInterval(interval);
  }, [streamedMessage]);

  // Streaming effect for problem statement in sidebar
  useEffect(() => {
    if (streamedProblem === undefined) {
      return;
    }

    if (streamingProblemInterval) {
      clearInterval(streamingProblemInterval);
      setStreamingProblemInterval(undefined);
    }

    setProblem('');
    let i = 0;
    const interval = setInterval(() => {
      if (i >= streamedProblem.length) {
        clearInterval(interval);
        setStreamingProblemInterval(undefined);
        setStreamedProblem(undefined);
        setIsProblemAgentLoading(false);
        return;
      }

      setProblem(streamedProblem.slice(0, i + 1));
      i++;
    }, 10);

    setStreamingProblemInterval(interval);
  }, [streamedProblem]);

  // Streaming effect for product features in sidebar
  useEffect(() => {
    if (streamedFeatures === undefined) {
      return;
    }

    if (streamingFeaturesInterval) {
      clearInterval(streamingFeaturesInterval);
      setStreamingFeaturesInterval(undefined);
    }

    setFeatures('');
    let i = 0;
    const interval = setInterval(() => {
      if (i >= streamedFeatures.length) {
        clearInterval(interval);
        setStreamingFeaturesInterval(undefined);
        setStreamedFeatures(undefined);
        setIsFeaturesAgentLoading(false);
        return;
      }

      setFeatures(streamedFeatures.slice(0, i + 1));
      i++;
    }, 10);

    setStreamingFeaturesInterval(interval);
  }, [streamedFeatures]);

  // TODO: If no need streaming effect, can replace streamedProducts with products
  useEffect(() => {
    if (streamedProducts === undefined) {
      return;
    }

    setProducts(streamedProducts);
    setStreamedProducts(undefined);
    setIsProductsAgentLoading(false);
  }, [streamedProducts]);

  return (
    <Group h="100%" wrap="nowrap">
      <Stack w="59%" h="100%" p="40px" bg="gray.0" align="center">
        <ChatHistory messages={messages} />
        <ChatInput
          placeholder="Share more details about the problem you wish to solve"
          backgroundColor="white"
          handleSubmit={handleSubmit}
          inputValue={inputValue}
          setInputValue={setInputValue}
          isLoading={
            isChatAgentLoading ||
            isProblemAgentLoading ||
            isFeaturesAgentLoading ||
            isProductsAgentLoading
          }
        />
      </Stack>
      <Sidebar problem={problem} features={features} />
    </Group>
  );
}

export default Chatbot;
