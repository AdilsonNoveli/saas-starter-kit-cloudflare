import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../locales/en.json';
import FieldManager from '@/components/fields/FieldManager';
import {
  phoneFieldConfig,
  emailFieldConfig,
  addressFieldConfig,
  urlFieldConfig,
  locationFieldConfig,
  customFieldFieldConfig,
  type PersonPhone,
  type PersonEmail,
  type PersonAddress,
  type PersonUrl,
  type PersonLocation,
  type PersonCustomField,
} from '@/lib/field-configs';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

// ─── Phone ────────────────────────────────────────────────────────────────────

describe('FieldManager — phones', () => {
  it('renders empty state', () => {
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={phoneFieldConfig}
        label="Phone Numbers"
        emptyText="No phone numbers added yet"
      />
    );

    expect(screen.getByText('Phone Numbers')).toBeInTheDocument();
    expect(screen.getByText('No phone numbers added yet')).toBeInTheDocument();
    expect(screen.getByText('+ Add')).toBeInTheDocument();
  });

  it('displays existing phone numbers with type badges', () => {
    const phones: PersonPhone[] = [
      { id: '1', type: 'Mobile', number: '+1234567890' },
      { id: '2', type: 'Work', number: '+0987654321' },
    ];

    renderWithIntl(
      <FieldManager
        items={phones}
        onChange={vi.fn()}
        fieldConfig={phoneFieldConfig}
        label="Phone Numbers"
        emptyText="No phone numbers added yet"
      />
    );

    expect(screen.getByText('Mobile')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('+0987654321')).toBeInTheDocument();
  });

  it('shows add form when add button is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={phoneFieldConfig}
        label="Phone Numbers"
        emptyText="No phone numbers added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));

    expect(screen.getByPlaceholderText('Phone number')).toBeInTheDocument();
  });

  it('adds a new phone number', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={phoneFieldConfig}
        label="Phone Numbers"
        emptyText="No phone numbers added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    await user.type(screen.getByPlaceholderText('Phone number'), '+1234567890');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'Mobile', number: '+1234567890' }),
    ]);
  });

  it('defaults to Mobile type for phones', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={phoneFieldConfig}
        label="Phone Numbers"
        emptyText="No phone numbers added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    expect(screen.getByPlaceholderText('Type')).toHaveValue('Mobile');
  });

  it('removes a phone number', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const phones: PersonPhone[] = [{ id: '1', type: 'Mobile', number: '+1234567890' }];

    renderWithIntl(
      <FieldManager
        items={phones}
        onChange={onChange}
        fieldConfig={phoneFieldConfig}
        label="Phone Numbers"
        emptyText="No phone numbers added yet"
      />
    );

    await user.click(screen.getByText('Remove'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('edits an existing phone number', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const phones: PersonPhone[] = [{ id: '1', type: 'Mobile', number: '+1234567890' }];

    renderWithIntl(
      <FieldManager
        items={phones}
        onChange={onChange}
        fieldConfig={phoneFieldConfig}
        label="Phone Numbers"
        emptyText="No phone numbers added yet"
      />
    );

    await user.click(screen.getByText('Edit'));
    const input = screen.getByDisplayValue('+1234567890');
    await user.clear(input);
    await user.type(input, '+9999999999');
    await user.click(screen.getByText('Save'));

    expect(onChange).toHaveBeenCalledWith([
      { id: '1', type: 'Mobile', number: '+9999999999' },
    ]);
  });

  it('cancels add without calling onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={phoneFieldConfig}
        label="Phone Numbers"
        emptyText="No phone numbers added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('No phone numbers added yet')).toBeInTheDocument();
  });
});

// ─── Email ────────────────────────────────────────────────────────────────────

describe('FieldManager — emails', () => {
  it('renders empty state', () => {
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={emailFieldConfig}
        label="Email Addresses"
        emptyText="No email addresses added yet"
      />
    );

    expect(screen.getByText('Email Addresses')).toBeInTheDocument();
    expect(screen.getByText('No email addresses added yet')).toBeInTheDocument();
  });

  it('displays existing emails with type badges', () => {
    const emails: PersonEmail[] = [
      { id: '1', type: 'Personal', email: 'personal@example.com' },
      { id: '2', type: 'Work', email: 'work@example.com' },
    ];

    renderWithIntl(
      <FieldManager
        items={emails}
        onChange={vi.fn()}
        fieldConfig={emailFieldConfig}
        label="Email Addresses"
        emptyText="No email addresses added yet"
      />
    );

    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('personal@example.com')).toBeInTheDocument();
    expect(screen.getByText('work@example.com')).toBeInTheDocument();
  });

  it('defaults to Personal type for emails', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={emailFieldConfig}
        label="Email Addresses"
        emptyText="No email addresses added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    expect(screen.getByPlaceholderText('Type')).toHaveValue('Personal');
  });

  it('does not have Home type for emails', () => {
    const emails: PersonEmail[] = [{ id: '1', type: 'Personal', email: 'test@example.com' }];

    renderWithIntl(
      <FieldManager
        items={emails}
        onChange={vi.fn()}
        fieldConfig={emailFieldConfig}
        label="Email Addresses"
        emptyText="No email addresses added yet"
      />
    );

    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('adds a new email', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={emailFieldConfig}
        label="Email Addresses"
        emptyText="No email addresses added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    await user.type(screen.getByPlaceholderText('email@example.com'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'Personal', email: 'test@example.com' }),
    ]);
  });

  it('allows editing email type to a custom value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const emails: PersonEmail[] = [{ id: '1', type: 'Personal', email: 'test@example.com' }];

    renderWithIntl(
      <FieldManager
        items={emails}
        onChange={onChange}
        fieldConfig={emailFieldConfig}
        label="Email Addresses"
        emptyText="No email addresses added yet"
      />
    );

    await user.click(screen.getByText('Edit'));
    const typeInput = screen.getByDisplayValue('Personal');
    await user.clear(typeInput);
    await user.type(typeInput, 'School');
    await user.click(screen.getByText('Save'));

    expect(onChange).toHaveBeenCalledWith([
      { id: '1', type: 'School', email: 'test@example.com' },
    ]);
  });
});

// ─── Address ──────────────────────────────────────────────────────────────────

describe('FieldManager — addresses', () => {
  it('renders empty state', () => {
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={addressFieldConfig}
        label="Addresses"
        emptyText="No addresses added yet"
      />
    );

    expect(screen.getByText('Addresses')).toBeInTheDocument();
    expect(screen.getByText('No addresses added yet')).toBeInTheDocument();
  });

  it('displays existing addresses', () => {
    const addresses: PersonAddress[] = [
      {
        id: '1',
        type: 'Home',
        streetLine1: '123 Main St',
        locality: 'San Francisco',
        country: 'US',
      },
    ];

    renderWithIntl(
      <FieldManager
        items={addresses}
        onChange={vi.fn()}
        fieldConfig={addressFieldConfig}
        label="Addresses"
        emptyText="No addresses added yet"
      />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
  });

  it('displays country name (not ISO code) in formatted address', () => {
    const addresses: PersonAddress[] = [
      {
        id: '1',
        type: 'Home',
        streetLine1: 'Calle Mayor 1',
        locality: 'Madrid',
        country: 'ES',
      },
    ];

    renderWithIntl(
      <FieldManager
        items={addresses}
        onChange={vi.fn()}
        fieldConfig={addressFieldConfig}
        label="Addresses"
        emptyText="No addresses added yet"
      />
    );

    expect(screen.getByText(/Spain/)).toBeInTheDocument();
    expect(screen.queryByText(/\bES\b/)).not.toBeInTheDocument();
  });

  it('renders country dropdown when adding', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={addressFieldConfig}
        label="Addresses"
        emptyText="No addresses added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));

    const countrySelect = screen.getByRole('combobox', { name: 'Country' });
    expect(countrySelect).toBeInTheDocument();

    const options = within(countrySelect).getAllByRole('option');
    const spainOption = options.find((o) => o.textContent === 'Spain');
    expect(spainOption).toBeInTheDocument();
    expect(spainOption).toHaveValue('ES');
  });

  it('stores country as ISO code', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={addressFieldConfig}
        label="Addresses"
        emptyText="No addresses added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    await user.type(screen.getByPlaceholderText('Street address line 1'), 'Calle Mayor 1');
    const countrySelect = screen.getByRole('combobox', { name: 'Country' });
    await user.selectOptions(countrySelect, 'ES');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ country: 'ES', streetLine1: 'Calle Mayor 1' }),
    ]);
  });

  it('supports streetLine1 and streetLine2', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={addressFieldConfig}
        label="Addresses"
        emptyText="No addresses added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    await user.type(
      screen.getByPlaceholderText('Street address line 1'),
      '123 Main St'
    );
    await user.type(
      screen.getByPlaceholderText('Street address line 2 (optional)'),
      'Suite 200'
    );
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ streetLine1: '123 Main St', streetLine2: 'Suite 200' }),
    ]);
  });

  it('defaults to Home type', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={addressFieldConfig}
        label="Addresses"
        emptyText="No addresses added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    expect(screen.getByPlaceholderText('Type')).toHaveValue('Home');
  });

  it('handles null country gracefully', () => {
    const addresses: PersonAddress[] = [
      { id: '1', type: 'Home', streetLine1: '123 Main St', country: null },
    ];

    renderWithIntl(
      <FieldManager
        items={addresses}
        onChange={vi.fn()}
        fieldConfig={addressFieldConfig}
        label="Addresses"
        emptyText="No addresses added yet"
      />
    );

    expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
  });
});

// ─── URL ──────────────────────────────────────────────────────────────────────

describe('FieldManager — URLs', () => {
  it('renders empty state', () => {
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={urlFieldConfig}
        label="URLs"
        emptyText="No websites added yet"
      />
    );

    expect(screen.getByText('URLs')).toBeInTheDocument();
    expect(screen.getByText('No websites added yet')).toBeInTheDocument();
  });

  it('displays existing URLs with type badges', () => {
    const urls: PersonUrl[] = [
      { id: '1', type: 'Personal', url: 'https://personal.com' },
      { id: '2', type: 'Work', url: 'https://work.com' },
    ];

    renderWithIntl(
      <FieldManager
        items={urls}
        onChange={vi.fn()}
        fieldConfig={urlFieldConfig}
        label="URLs"
        emptyText="No websites added yet"
      />
    );

    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('https://personal.com')).toBeInTheDocument();
  });

  it('renders safe URLs as clickable links', () => {
    const urls: PersonUrl[] = [{ id: '1', type: 'Personal', url: 'https://example.com' }];

    renderWithIntl(
      <FieldManager
        items={urls}
        onChange={vi.fn()}
        fieldConfig={urlFieldConfig}
        label="URLs"
        emptyText="No websites added yet"
      />
    );

    const link = screen.getByRole('link', { name: 'https://example.com' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('defaults to Personal type', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={urlFieldConfig}
        label="URLs"
        emptyText="No websites added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    expect(screen.getByPlaceholderText('Type')).toHaveValue('Personal');
  });

  it('does not show Home type option', () => {
    const urls: PersonUrl[] = [{ id: '1', type: 'Personal', url: 'https://example.com' }];

    renderWithIntl(
      <FieldManager
        items={urls}
        onChange={vi.fn()}
        fieldConfig={urlFieldConfig}
        label="URLs"
        emptyText="No websites added yet"
      />
    );

    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('adds a new URL', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={urlFieldConfig}
        label="URLs"
        emptyText="No websites added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://mywebsite.com');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'Personal', url: 'https://mywebsite.com' }),
    ]);
  });

  it('allows custom type values', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={urlFieldConfig}
        label="URLs"
        emptyText="No websites added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    const typeInput = screen.getByPlaceholderText('Type');
    await user.clear(typeInput);
    await user.type(typeInput, 'Portfolio');
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://portfolio.com');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'Portfolio', url: 'https://portfolio.com' }),
    ]);
  });
});

// ─── Location ─────────────────────────────────────────────────────────────────

describe('FieldManager — locations', () => {
  it('renders empty state', () => {
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={locationFieldConfig}
        label="Locations"
        emptyText="No locations added yet"
      />
    );

    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('No locations added yet')).toBeInTheDocument();
  });

  it('displays existing locations with coordinates', () => {
    const locations: PersonLocation[] = [
      { id: '1', type: 'home', latitude: 40.7128, longitude: -74.006, label: 'NY Office' },
    ];

    renderWithIntl(
      <FieldManager
        items={locations}
        onChange={vi.fn()}
        fieldConfig={locationFieldConfig}
        label="Locations"
        emptyText="No locations added yet"
      />
    );

    expect(screen.getByText(/40.712800/)).toBeInTheDocument();
    expect(screen.getByText('NY Office')).toBeInTheDocument();
    const mapLink = screen.getByRole('link', { name: 'View on map' });
    expect(mapLink).toHaveAttribute('href', expect.stringContaining('40.7128'));
  });

  it('adds a new location', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={locationFieldConfig}
        label="Locations"
        emptyText="No locations added yet"
      />
    );

    await user.click(screen.getByText('+ Add'));
    const latInput = screen.getByPlaceholderText('Latitude (-90 to 90)');
    const lonInput = screen.getByPlaceholderText('Longitude (-180 to 180)');
    await user.clear(latInput);
    await user.type(latInput, '51.5');
    await user.clear(lonInput);
    await user.type(lonInput, '0.12');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ latitude: 51.5, longitude: 0.12 }),
    ]);
  });
});

// ─── Custom Fields ─────────────────────────────────────────────────────────────

describe('FieldManager — customFields', () => {
  it('renders empty state', () => {
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={vi.fn()}
        fieldConfig={customFieldFieldConfig}
        label="Custom Fields"
        emptyText="No custom fields added yet"
      />
    );

    expect(screen.getByText('Custom Fields')).toBeInTheDocument();
    expect(screen.getByText('No custom fields added yet')).toBeInTheDocument();
  });

  it('displays existing custom fields with key badges', () => {
    const fields: PersonCustomField[] = [
      { id: '1', key: 'X-TWITTER', value: '@johndoe' },
    ];

    renderWithIntl(
      <FieldManager
        items={fields}
        onChange={vi.fn()}
        fieldConfig={customFieldFieldConfig}
        label="Custom Fields"
        emptyText="No custom fields added yet"
      />
    );

    expect(screen.getByText('X-TWITTER')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
  });

  it('adds a new custom field from preset', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={customFieldFieldConfig}
        label="Custom Fields"
        emptyText="No custom fields added yet"
      />
    );

    await user.click(screen.getByText('+ Add Field'));

    // Select a preset
    const presetSelect = screen.getByRole('combobox', { name: /field type/i });
    await user.selectOptions(presetSelect, 'X-TWITTER');

    // Fill in value
    const valueInput = screen.getByPlaceholderText('Value');
    await user.type(valueInput, '@johndoe');

    await user.click(screen.getByRole('button', { name: 'Add Field' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'X-TWITTER', value: '@johndoe' }),
    ]);
  });

  it('normalises custom key to uppercase X- prefix', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithIntl(
      <FieldManager
        items={[]}
        onChange={onChange}
        fieldConfig={customFieldFieldConfig}
        label="Custom Fields"
        emptyText="No custom fields added yet"
      />
    );

    await user.click(screen.getByText('+ Add Field'));

    // X-CUSTOM preset is default, shows key input
    const keyInput = screen.getByPlaceholderText('Custom key (e.g., X-DEPARTMENT)');
    await user.type(keyInput, 'department');
    await user.type(screen.getByPlaceholderText('Value'), 'Engineering');

    await user.click(screen.getByRole('button', { name: 'Add Field' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'X-DEPARTMENT', value: 'Engineering' }),
    ]);
  });

  it('removes a custom field', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const fields: PersonCustomField[] = [{ id: '1', key: 'X-TWITTER', value: '@johndoe' }];

    renderWithIntl(
      <FieldManager
        items={fields}
        onChange={onChange}
        fieldConfig={customFieldFieldConfig}
        label="Custom Fields"
        emptyText="No custom fields added yet"
      />
    );

    await user.click(screen.getByText('Remove'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
