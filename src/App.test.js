import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('renders app structure correctly', async () => {
  render(<App />);

  await waitFor(() => {
    const loadingElement = document.querySelector('.auth-loading');
    expect(loadingElement).toBeInTheDocument();
  });
});