import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';

const { login } = vi.hoisted(() => ({
  login: vi.fn().mockRejectedValue(new Error('Signup is not available for this email.')),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ login }),
}));

describe('Login', () => {
  it('announces rejected access and describes invitation-only entry', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByText(/Access is invitation-only/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Coach Email'), 'visitor@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Signup is not available for this email.');
  });
});
