# Custom Password Field Implementation

## Overview
This document describes the implementation of a custom password option in the PPPoE pattern system, allowing administrators to specify a fixed password for all customers instead of generating passwords dynamically.

## Changes Made

### 1. Frontend - PPPoESetup.tsx
**File**: `frontend/src/pages/PPPoESetup.tsx`

Added custom password option to the password components array:

```typescript
const passwordComponents = [
  // ... existing components
  { type: 'custom_password', label: 'Custom Password' }
];
```

**Impact**: Users can now drag "Custom Password" into the password pattern sequence.

### 2. Backend - PPPoEController.php
**File**: `backend/app/Http/Controllers/PPPoEController.php`

Updated the `getAvailableTypes()` method to include custom password:

```php
'password' => [
    // ... existing types
    ['type' => 'custom_password', 'label' => 'Custom Password'],
]
```

**Impact**: API returns custom password as a valid password component option.

### 3. Backend - PPPoEUsernamePattern Model
**File**: `backend/app/Models/PPPoEUsernamePattern.php`

Added computed attribute to detect if pattern uses custom password:

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

**Impact**: Pattern objects now include `has_custom_password` flag for frontend use.

### 4. Backend - PppoeUsernameService
**File**: `backend/app/Services/PppoeUsernameService.php`

#### Updated Model Import
Changed from `PppoeUsernamePattern` to `PPPoEUsernamePattern` (case fix):

```php
use App\Models\PPPoEUsernamePattern;
```

#### Added Custom Password Handler
Added case in `getValueForType()` method:

```php
case 'custom_password':
    return $customerData['custom_password'] ?? '';
```

**Impact**: Service now retrieves custom password from customer data when generating passwords.

## Usage Flow

### Administrator Side

1. Navigate to PPPoE Setup page
2. Create/Edit a Password Pattern
3. Drag "Custom Password" component into the password sequence
4. Save the pattern

### System Behavior

When a job order is created/updated and password needs to be generated:

1. System checks if password pattern includes `custom_password` type
2. If yes, system looks for `custom_password` in the customer data array
3. If `custom_password` is provided, it uses that value
4. If not provided, that component returns empty string (may fall back to random password)

### Integration Points

To use custom passwords in job order creation, pass it in customer data:

```php
$customerData = [
    'first_name' => 'John',
    'middle_initial' => 'D',
    'last_name' => 'Doe',
    'mobile_number' => '09123456789',
    'custom_password' => 'MySecurePass123'  // Add this
];

$pppoeService = new PppoeUsernameService();
$password = $pppoeService->generatePassword($customerData);
```

## Frontend Integration (Required)

To complete the implementation, the job order creation/edit forms need to be updated:

### Required Changes

1. **Check if custom password is required**:
   ```typescript
   // Fetch password pattern and check has_custom_password
   const passwordPattern = await pppoeService.getPatterns('password');
   const requiresCustomPassword = passwordPattern[0]?.has_custom_password;
   ```

2. **Add custom password input field**:
   ```typescript
   {requiresCustomPassword && (
     <div>
       <label>Custom Password *</label>
       <input
         type="password"
         value={customPassword}
         onChange={(e) => setCustomPassword(e.target.value)}
         required
       />
     </div>
   )}
   ```

3. **Include in form submission**:
   ```typescript
   const formData = {
     // ... other fields
     custom_password: requiresCustomPassword ? customPassword : undefined
   };
   ```

### Files to Update

- `frontend/src/modals/JobOrderDoneFormModal.tsx`
- `frontend/src/modals/JobOrderDoneFormTechModal.tsx`
- `frontend/src/modals/JobOrderEditFormModal.tsx`
- Any other forms that create/update job orders with PPPoE credentials

## Database Structure

No database changes required. The custom password value is:
- Passed transiently in the customer data array
- Not stored in the patterns table (only the type 'custom_password' is stored)
- Should be captured at job order creation time

## Example Patterns

### Example 1: Fixed Password for All
Pattern Sequence:
```json
[
  {"id":"1","type":"custom_password","label":"Custom Password"}
]
```

Result: All customers get the same password provided by admin.

### Example 2: Lastname + Custom Password
Pattern Sequence:
```json
[
  {"id":"1","type":"last_name","label":"Last Name"},
  {"id":"2","type":"custom_password","label":"Custom Password"}
]
```

Result: `smithMySecurePass123` (if last_name is "smith" and custom_password is "MySecurePass123")

### Example 3: Custom Password + Random Digits
Pattern Sequence:
```json
[
  {"id":"1","type":"custom_password","label":"Custom Password"},
  {"id":"2","type":"random_4_digits","label":"Random 4 Digits"}
]
```

Result: `MySecurePass1234` (custom password + 4 random digits)

## Security Considerations

1. **Password Visibility**: Custom passwords will be visible to administrators entering them
2. **Password Reuse**: Same password across customers is possible if pattern only contains custom_password
3. **Storage**: Custom passwords should follow standard security practices when stored in job_orders table
4. **Validation**: Consider adding password strength validation in frontend forms

## Testing Checklist

- [ ] Custom password option appears in PPPoE Setup password components
- [ ] Pattern can be saved with custom_password component
- [ ] Pattern retrieval includes has_custom_password flag
- [ ] Job order forms detect when custom password is required
- [ ] Custom password field appears when required
- [ ] Password generation uses custom password when provided
- [ ] Password generation falls back correctly when custom password not provided
- [ ] Multiple custom_password components in sequence work correctly

## Rollback Plan

If issues occur:
1. Remove custom_password from passwordComponents array in PPPoESetup.tsx
2. Remove custom_password case from PppoeUsernameService.php
3. Existing patterns without custom_password continue working normally
4. System falls back to random password generation

## Next Steps

1. Update job order forms to include custom password input field
2. Add validation for custom password strength
3. Consider adding password visibility toggle in forms
4. Add unit tests for custom password generation
5. Update user documentation with custom password feature
