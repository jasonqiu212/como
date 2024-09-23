import { Alert, Group, Modal, Stack, Text } from '@mantine/core';
import '@mantine/core/styles.css';
import { useThrottledState } from '@mantine/hooks';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
  // todo: this needs to be a list of products
  const [products, setProducts] = useState<string | undefined>();
  const [streamedProducts, setStreamedProducts] = useThrottledState<
    string | undefined
  >(undefined, 20);

  const [inputValue, setInputValue] = useState('');
  const [isLoadingAgentResponseMap, setIsLoadingAgentResponseMap] = useState({
    chat: false,
    problem: false,
    features: false,
    products: false,
  });

  const getReactStateForGraph = () => {
    return {
      problem: streamedProblem !== undefined ? streamedProblem : problem,
      features: streamedFeatures !== undefined ? streamedFeatures : features,
      products: streamedProducts !== undefined ? streamedProducts : products,
    };
  };
  const graph = useMemo(
    () =>
      new HaveAnotLanggraph(
        getReactStateForGraph,
        setStreamedMessage,
        setStreamedProblem,
        setStreamedFeatures,
        setStreamedProducts,
      ),
    [],
  );

  const handleSubmit = async (message: string = inputValue) => {
    if (
      Object.values(isLoadingAgentResponseMap).every((value) => value === false)
    ) {
      setInputValue('');
      setIsLoadingAgentResponseMap({
        chat: true,
        problem: true,
        features: true,
        products: true,
      });
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'Human', text: message },
      ]);
      // currently only supports one thread
      await graph.invoke(message, { configurable: { thread_id: 1 } });
    }
  };

  // submits the problem statement (set in the context from homepage) as the first message from the user
  useEffect(() => {
    if (initProblemStatement !== null) {
      handleSubmit(initProblemStatement);
    }
  }, []);

  // gives the effect that chat messages are being streamed in
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
    let i = 0;
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'AI', text: '' } as Message,
    ]);
    const interval = setInterval(() => {
      if (i < streamedMessage.length) {
        setMessages((prevMessages) => {
          const messages = [...prevMessages];
          messages[messages.length - 1] = {
            role: 'AI',
            text: streamedMessage.slice(0, i + 1),
          };
          return messages;
        });
        i++;
      } else {
        clearInterval(interval);
        setStreamingMessageInterval(undefined);
        setStreamedMessage(undefined);
        setIsLoadingAgentResponseMap({
          ...isLoadingAgentResponseMap,
          chat: false,
        });
      }
    }, 10);
    setStreamingMessageInterval(interval);
  }, [streamedMessage]);

  // gives the effect that problem in sidebar is being streamed in
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
      if (i < streamedProblem.length) {
        setProblem(streamedProblem.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setStreamingProblemInterval(undefined);
        setStreamedProblem(undefined);
        setIsLoadingAgentResponseMap({
          ...isLoadingAgentResponseMap,
          problem: false,
        });
        // NOTE: temporarily set all agents to have responded, since we have not implemented the problem, features, products agents
        setIsLoadingAgentResponseMap({
          chat: false,
          problem: false,
          features: false,
          products: false,
        });
      }
    }, 10);
    setStreamingProblemInterval(interval);
  }, [streamedProblem]);

  if (initProblemStatement === null) {
    return (
      <Modal
        centered
        onClose={() => {
          navigate('/');
        }}
        opened
        title={<Text fw="bold">Unauthorised</Text>}
      >
        <Alert color="red">
          Please come up with a problem statement first.
        </Alert>
      </Modal>
    );
  } else {
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
            isLoading={isLoadingAgentResponseMap.chat}
          />
        </Stack>
        <Sidebar
          problem={problem}
          solutionRequirements={[]}
          solutionExplanation={features}
        />
      </Group>
    );
  }
}

export default Chatbot;
