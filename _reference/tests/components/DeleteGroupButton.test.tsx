import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import DeleteGroupButton from '../../components/DeleteGroupButton';
import enMessages from '../../locales/en.json';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Wrapper component for tests
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe('DeleteGroupButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Modal opening and closing', () => {
    it('should open confirmation modal when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });

    it('should close modal and reset state when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      // Open modal
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      // Check the "Delete all people" checkbox
      const deletePeopleCheckbox = screen.getByRole('checkbox', {
        name: /delete all people in this group too/i,
      });
      await user.click(deletePeopleCheckbox);

      // Close modal
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Reopen modal
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      // Checkbox should be unchecked (state reset)
      const newDeletePeopleCheckbox = screen.getByRole('checkbox', {
        name: /delete all people in this group too/i,
      });
      expect(newDeletePeopleCheckbox).not.toBeChecked();
    });
  });

  describe('Message display', () => {
    it('should display updated deletion message', async () => {
      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Friends" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(
        screen.getByText(/this action will only remove the group, but will not delete the people themselves/i)
      ).toBeInTheDocument();
    });
  });

  describe('Delete people checkbox behavior', () => {
    it('should show "Delete all people in this group too" checkbox', async () => {
      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(
        screen.getByRole('checkbox', { name: /delete all people in this group too/i })
      ).toBeInTheDocument();
    });

    it('should disable delete button when "Delete people" is checked but not confirmed', async () => {
      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      const modalDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1]; // Modal delete button
      expect(modalDeleteButton).not.toBeDisabled();

      // Check "Delete people" checkbox
      const deletePeopleCheckbox = screen.getByRole('checkbox', {
        name: /delete all people in this group too/i,
      });
      await user.click(deletePeopleCheckbox);

      // Delete button should now be disabled
      expect(modalDeleteButton).toBeDisabled();
    });

    it('should show confirmation checkbox when "Delete people" is checked', async () => {
      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      // Initially, confirmation checkbox should not be visible
      expect(screen.queryByRole('checkbox', { name: /yes, i'm sure!/i })).not.toBeInTheDocument();

      // Check "Delete people" checkbox
      const deletePeopleCheckbox = screen.getByRole('checkbox', {
        name: /delete all people in this group too/i,
      });
      await user.click(deletePeopleCheckbox);

      // Now confirmation checkbox should appear
      expect(screen.getByRole('checkbox', { name: /yes, i'm sure!/i })).toBeInTheDocument();
    });

    it('should enable delete button when both checkboxes are checked', async () => {
      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      const modalDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1];

      // Check "Delete people" checkbox
      const deletePeopleCheckbox = screen.getByRole('checkbox', {
        name: /delete all people in this group too/i,
      });
      await user.click(deletePeopleCheckbox);

      expect(modalDeleteButton).toBeDisabled();

      // Check confirmation checkbox
      const confirmCheckbox = screen.getByRole('checkbox', { name: /yes, i'm sure!/i });
      await user.click(confirmCheckbox);

      // Delete button should now be enabled
      expect(modalDeleteButton).not.toBeDisabled();
    });

    it('should hide confirmation checkbox when "Delete people" is unchecked', async () => {
      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      // Check "Delete people" checkbox
      const deletePeopleCheckbox = screen.getByRole('checkbox', {
        name: /delete all people in this group too/i,
      });
      await user.click(deletePeopleCheckbox);

      expect(screen.getByRole('checkbox', { name: /yes, i'm sure!/i })).toBeInTheDocument();

      // Uncheck "Delete people"
      await user.click(deletePeopleCheckbox);

      // Confirmation checkbox should be hidden
      expect(screen.queryByRole('checkbox', { name: /yes, i'm sure!/i })).not.toBeInTheDocument();
    });

    it('should reset confirmation checkbox when "Delete people" is unchecked', async () => {
      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      // Check both checkboxes
      const deletePeopleCheckbox = screen.getByRole('checkbox', {
        name: /delete all people in this group too/i,
      });
      await user.click(deletePeopleCheckbox);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /yes, i'm sure!/i });
      await user.click(confirmCheckbox);

      // Uncheck "Delete people"
      await user.click(deletePeopleCheckbox);

      // Check "Delete people" again
      await user.click(deletePeopleCheckbox);

      // Confirmation checkbox should be unchecked
      const newConfirmCheckbox = screen.getByRole('checkbox', { name: /yes, i'm sure!/i });
      expect(newConfirmCheckbox).not.toBeChecked();
    });
  });

  describe('API calls', () => {
    it('should call delete API without deletePeople parameter by default', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Group deleted successfully' }),
        })
      ) as unknown as typeof fetch;
      global.fetch = mockFetch;

      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));
      const modalDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1];
      await user.click(modalDeleteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/groups/group-1'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });

      // URL should not include deletePeople parameter
      const callUrl = vi.mocked(mockFetch).mock.calls[0][0] as string;
      expect(callUrl).not.toContain('deletePeople');
    });

    it('should call delete API with deletePeople=true when both checkboxes are checked', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Group deleted successfully' }),
        })
      ) as unknown as typeof fetch;
      global.fetch = mockFetch;

      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      // Check both checkboxes
      const deletePeopleCheckbox = screen.getByRole('checkbox', {
        name: /delete all people in this group too/i,
      });
      await user.click(deletePeopleCheckbox);

      const confirmCheckbox = screen.getByRole('checkbox', { name: /yes, i'm sure!/i });
      await user.click(confirmCheckbox);

      const modalDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1];
      await user.click(modalDeleteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // URL should include deletePeople=true parameter
      const callUrl = vi.mocked(mockFetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('deletePeople=true');
    });

    it('should not call API with deletePeople if only first checkbox is checked', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Group deleted successfully' }),
        })
      ) as unknown as typeof fetch;
      global.fetch = mockFetch;

      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      // Check only "Delete people" checkbox (not confirmation)
      const deletePeopleCheckbox = screen.getByRole('checkbox', {
        name: /delete all people in this group too/i,
      });
      await user.click(deletePeopleCheckbox);

      // Button is disabled, so we can't click it
      const modalDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1];
      expect(modalDeleteButton).toBeDisabled();

      // Should not have called the API
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should disable button while deleting', async () => {
      const mockFetch = vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ message: 'Group deleted successfully' }),
                }),
              100
            )
          )
      ) as unknown as typeof fetch;
      global.fetch = mockFetch;

      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      const modalDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1];
      await user.click(modalDeleteButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
      });
    });

    it('should show error message on API failure', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Something went wrong' }),
        })
      ) as unknown as typeof fetch;
      global.fetch = mockFetch;

      const user = userEvent.setup();
      render(<Wrapper><DeleteGroupButton groupId="group-1" groupName="Test Group" /></Wrapper>);

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      const modalDeleteButton = screen.getAllByRole('button', { name: /delete/i })[1];
      await user.click(modalDeleteButton);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });
  });
});
