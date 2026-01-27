# Custom Password Implementation - Complete Guide

## Overview
The custom password feature allows administrators to set a fixed password in the PPPoE pattern. When "Custom Password" is selected, all other password components are disabled, ensuring only the custom password is used.

## Features

1. **Exclusive Selection**: When custom password is added, all other components are disabled
2. **Input Field in Sequence**: After adding custom password to sequence, an input field appears
3. **Real-time Preview**: The preview updates to show the actual custom password value
4. **Validation**: System validates that custom password value is provided before saving

## Implementation Details

### Frontend Changes

#### 1. PPPoESetup.tsx - Main Component

**New State**:
```typescript
const [customPasswordValue, setCustomPasswordValue] = useState('');
```

**Key Functions**:

- `hasCustomPassword()`: Checks if sequence contains custom password component
- `isComponentDisabled()`: Disables all components when custom password is in sequence
- `handleDragStart()`: Prevents dragging when custom password already exists or when trying to add other components with custom password
- `handleDrop()`: Handles custom password as exclusive - clears other components when dropped
- `updateCustomPasswordValue()`: Updates custom password value in sequence item
- `getPreviewText()`: Shows actual password value in preview instead of placeholder

**Validation**:
```typescript
if (hasCustomPassword() && !customPasswordValue.trim()) {
  setErrorMessage('Please enter a custom password value');
  setShowError(true);
  return;
}
```

**Visual Indicators**:
- Custom password components show in purple background
- Disabled components are grayed out with reduced opacity
- Custom password input field appears directly below the component in sequence

#### 2. SequenceItem Interface

Already includes `value?: string` field to store custom password:

```typescript
export interface SequenceItem {
  id: string;
  type: string;
  label: string;
  value?: string;  // Stores custom password value
}
```

### Backend Changes

#### 1. PppoeUsernameService.php

**Updated `generatePassword()` method**:

```php
foreach ($sequence as $part) {
    $type = $part['type'] ?? '';
    
    if ($type === 'custom_password') {
        // First try to get value from sequence, then from customer data
        $value = $part['value'] ?? $customerData['custom_password'] ?? '';
    } else {
        $value = $this->getValueForType($type, $customerData);
    }
    
    if ($value) {
        $passwordParts[] = $value;
    }
}
```

**Priority Order**:
1. Value stored in pattern sequence (`$part['value']`)
2. Value from customer data (`$customerData['custom_password']`)
3. Empty string if neither exists

This allows the custom password to be:
- Stored in the pattern itself (most common)
- Overridden per-customer if needed (future enhancement)

#### 2. PPPoEController.php

Added custom password to available options:
```php
['type' => 'custom_password', 'label' => 'Custom Password']
```

#### 3. PPPoEUsernamePattern.php

Added computed attribute to detect custom password usage:
```php
protected $appends = ['has_custom_password'];

public function getHasCustomPasswordAttribute(): bool
{
    if (!is_array($this->sequence)) {
        return false;
    }

    foreach ($this->sequence as $item) {
        if (isset($item['type']) && $item['type'] === 'custom_password') {
            return true;
        }
    }

    return false;
}
```

## User Flow

### Creating Custom Password Pattern

1. Navigate to PPPoE Setup page
2. Click "Create/Edit Pattern"
3. Select "Password" as pattern type
4. Drag "Custom Password" component to sequence
   - All other components immediately become disabled
   - Input field appears below the custom password component
5. Enter the desired password in the input field
6. Preview updates to show actual password value
7. Click "Save Pattern"

### Editing Existing Pattern

1. Click edit button on existing password pattern
2. If pattern contains custom password:
   - Other components are automatically disabled
   - Custom password value loads into input field
3. Modify password value if needed
4. Save changes

### Removing Custom Password

1. Click the X button on custom password component
2. All other components become available again
3. Can now build pattern with multiple components

## Behavior Rules

### When Custom Password is in Sequence:

- ✅ Only custom password component is active
- ❌ Cannot drag any other components
- ❌ Cannot drag another custom password (only one allowed)
- ✅ Custom password input field is visible
- ✅ Preview shows actual password value
- ✅ Can remove custom password to use other components

### When Custom Password is NOT in Sequence:

- ✅ All password components are available
- ✅ Can drag and combine multiple components
- ✅ Custom password can be added (becomes exclusive)
- ✅ Preview shows component placeholders

## Data Storage

### Pattern Sequence Format

When saved to database, custom password is stored in sequence:

```json
{
  "pattern_name": "Fixed Password Pattern",
  "pattern_type": "password",
  "sequence": [
    {
      "id": "1737701234567",
      "type": "custom_password",
      "label": "Custom Password",
      "value": "MySecurePass123"
    }
  ]
}
```

### API Response

Pattern retrieval includes computed attribute:

```json
{
  "id": 1,
  "pattern_name": "Fixed Password Pattern",
  "pattern_type": "password",
  "sequence": [...],
  "has_custom_password": true,  // Computed attribute
  "created_at": "2025-01-24T10:00:00.000000Z"
}
```

## Security Considerations

### Password Visibility
- Custom password is visible in plain text in the admin interface
- Consider adding password visibility toggle if needed
- Only administrators should access PPPoE Setup page

### Password Storage
- Password stored in pattern as plain text (by design)
- Same password used for all customers (if pattern only contains custom_password)
- Consider security implications before using single password for all users

### Recommendations
1. Use strong custom passwords (minimum 12 characters)
2. Combine with other components for variation:
   ```
   Custom Password + Last 4 Mobile = "MyPass1234" + "5678"
   ```
3. Regularly update custom passwords
4. Use different patterns for different customer groups if needed

## Testing Checklist

- [ ] Custom password option appears in password components list
- [ ] Dragging custom password disables all other components
- [ ] Input field appears when custom password in sequence
- [ ] Preview updates to show actual password value
- [ ] Cannot drag other components when custom password exists
- [ ] Cannot drag second custom password
- [ ] Removing custom password re-enables other components
- [ ] Validation prevents saving without password value
- [ ] Pattern saves with custom password value in sequence
- [ ] Editing existing pattern loads custom password value
- [ ] Password generation uses value from pattern sequence
- [ ] Generated passwords match the custom password

## Example Use Cases

### Use Case 1: Company Standard Password
All new customers get the same initial password that they must change on first login.

**Pattern**:
```json
[
  {"type": "custom_password", "value": "Welcome2024!"}
]
```

### Use Case 2: Department-Based Password
Different patterns for different departments, each with their own password.

**Sales Pattern**:
```json
[
  {"type": "custom_password", "value": "Sales2024!"}
]
```

**Technical Pattern**:
```json
[
  {"type": "custom_password", "value": "Tech2024!"}
]
```

### Use Case 3: Password with Personalization
Custom base password + user identifier for slight variation.

**Pattern**:
```json
[
  {"type": "custom_password", "value": "Base2024"},
  {"type": "mobile_number_last_4", "label": "Mobile (Last 4)"}
]
```

**Result**: "Base20245678" (where 5678 is last 4 digits of mobile)

## Troubleshooting

### Issue: Custom password not saving
**Solution**: Ensure password value is entered in input field before saving

### Issue: Other components still draggable
**Solution**: Check `isComponentDisabled()` function is properly checking `hasCustomPassword()`

### Issue: Password not generating correctly
**Solution**: Verify `generatePassword()` in service checks for `custom_password` type and retrieves value

### Issue: Cannot remove custom password
**Solution**: Click X button on component, not the input field

## Future Enhancements

1. **Password Strength Indicator**: Show strength meter in input field
2. **Password Visibility Toggle**: Add eye icon to show/hide password
3. **Password Generator**: Button to generate random secure password
4. **Password History**: Track changes to custom password over time
5. **Per-Customer Override**: Allow overriding pattern password for specific customers
6. **Multiple Custom Passwords**: Support different passwords for different customer groups
7. **Password Expiration**: Prompt to update password after certain period
8. **Encryption**: Encrypt custom password in database (requires key management)

## API Integration

No changes needed for job order creation - the custom password is embedded in the pattern sequence and automatically used during password generation.

The service retrieves the password value from the pattern:
```php
$password = $pppoeService->generatePassword([
    'first_name' => 'John',
    'last_name' => 'Doe',
    // custom_password not needed - comes from pattern
]);
```

## Migration Notes

Existing patterns without custom password continue working normally. The feature is fully backward compatible - patterns using dynamic components are unaffected.
