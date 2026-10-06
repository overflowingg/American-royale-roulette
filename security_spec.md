# Security Specification: Vantage Roulette

## Data Invariants
1. A **Bet** must belong to a valid **Player**.
2. A **Bet** cannot be modified once its status is set to 'won' or 'lost' (terminal state), except by a manager.
3. **Player** chips can only be updated by the system (via functions, but here client-side for simplicity, we'll try to harden it) or by winners.
4. **GameResults** are read-only for players.
5. **Manager** access is restricted to users whose email matches institutional manager emails.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to create a bet with another user's `playerId`.
2. **Chip Inflation**: Attempt to update own `chips` field to 1,000,000.
3. **Ghost Field**: Attempt to add `isAdmin: true` to a player document.
4. **Terminal Bypass**: Attempt to change a 'lost' bet back to 'pending'.
5. **Collection Scraping**: Attempting to list all players without manager rights.
6. **ID Poisoning**: Creating a bet with a 2KB junk character string as ID.
7. **Type Mismatch**: Sending `chips: "lots"` (string instead of number).
8. **PII Leak**: Non-manager attempting to read another player's private data (email).
9. **Admin Spoofing**: Setting `isManager: true` on own profile during creation.
10. **Resource Exhaustion**: Sending an array of 10,000 elements in a bet description.
11. **Timestamp Manipulation**: Sending a `timestamp` from 2005.
12. **Orphaned Bet**: Creating a bet for a `gameId` that doesn't exist.

## Test Runner (Logic Outline)
The logic ensures:
- `request.auth.uid == resource.data.uid` for player profile writes.
- `request.resource.data.keys().hasOnly(...)` for specific update actions.
- `isManager()` check for aggregate data.
