import React, { useEffect } from 'react';
import App from './App';
import { loadOpenAIKeyIntoRuntime } from './utils/openai';

const AppWrapper: React.FC = () => {
  useEffect(() => {
    loadOpenAIKeyIntoRuntime();
  }, []);

  return <App />;
};

export default AppWrapper;
