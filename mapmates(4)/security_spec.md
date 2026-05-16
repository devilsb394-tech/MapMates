# Security Specification for MapMates

## 1. Data Invariants
- **User Privacy**: Private user data (PII, friends lists, settings) must be restricted to the owner.
- **Relational Integrity**: Friend requests and conversations must only be accessible to participants.
- **Public Visibility**: Map markers like approved labels, help signals, and public destinies are visible to all authenticated users.
- **Action-Based Updates**: State transitions (e.g., status changes) should be guarded by allowed fields only.

## 2. The "Dirty Dozen" Payloads
These payloads should return `PERMISSION_DENIED`.

1. **Identity Spoofing**: `create` a user profile with a different `uid`.
2. **PII Leak**: `get` another user's email or private settings.
3. **Friendship Hijack**: `list` friend requests belonging to users `A` and `B` as user `C`.
4. **Relational Bypass**: `create` a message in a conversation where the user is not a participant.
5. **Private Path Access**: `list` `path_points` for a user other than self.
6. **Destiny Peeping**: `list` destinies where `visibility` is not 'all' and user is not owner.
7. **Label Hijack**: `update` a label's `status` to 'approved' without being an admin.
8. **Help Signal Abuse**: `delete` another user's help signal.
9. **Terminal State Lockout**: `update` a 'completed' destiny to 'active'.
10. **Ghost Fields**: `create` a document with extra unvetted fields like `isVerified: true`.
11. **Spoofed Ownership**: `update` another user's `createdAt` or `creatorId`.
12. **Blanket Query**: `list` all `friendRequests` without filtering for current user participation.

## 3. Test Runner (Draft)
```ts
// firestore.rules.test.ts
// Tests would go here using the Firebase Rules Unit Testing SDK.
```
