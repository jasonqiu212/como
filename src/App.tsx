import { AppShell, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

import './App.css';
import logo from './assets/logo.svg';
import Landing from './pages/Landing';

function App() {
  return (
    <MantineProvider>
      <AppShell header={{ height: 128 }} padding="40px">
        <AppShell.Header p="40px">
          <a href=".">
            <img src={logo} className="logo" alt="Logo" />
          </a>
        </AppShell.Header>
        <AppShell.Main w="100%">
          <Landing />
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
