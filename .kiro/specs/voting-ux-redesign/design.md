# Design Document

## Overview

This design document outlines the architectural changes needed to transform the current live-results voting system into a controlled, suspenseful voting experience. The redesign separates voter experience from results viewing, introduces confirmation modals, and adds engaging winner reveal animations.

## Architecture

### Current System Flow

1. Admin starts voting → All participants see live results immediately
2. Participants vote → Results update in real-time for everyone
3. Voting ends → Final results displayed

### New System Flow

1. Admin starts voting → Participants see voting interface only
2. Participants vote with confirmation → See their own vote status only
3. Admin controls category progression → Participants wait for next category
4. Admin reveals winners at end → Confetti animations and results display

## Components and Interfaces

### 1. Participant Experience Components

#### VotingInterface Component

- **Purpose**: Clean voting interface without live results
- **State Management**:
  - `votingSession`: Current category info
  - `hasVoted`: Boolean tracking vote status
  - `selectedOption`: User's vote choice
  - `showConfirmation`: Modal state
- **Key Features**:
  - Award title and description display
  - Nominee selection with search functionality
  - Confirmation modal before vote submission
  - Post-vote status display

#### ConfirmationModal Component

- **Purpose**: Prevent accidental votes
- **Props**: `nominee`, `onConfirm`, `onCancel`
- **Design**: Modal overlay with clear nominee name and action buttons
- **Accessibility**: Focus management and keyboard navigation

#### WaitingState Component

- **Purpose**: Clear status communication
- **States**:
  - "Waiting for admin to start voting"
  - "Wait for the admin to begin the next category"
  - "Voting session complete"

### 2. Admin Control Components

#### CategoryController Component

- **Purpose**: Admin controls for category management
- **Features**:
  - Start/stop voting buttons per category
  - Real-time vote count display (admin only)
  - Category status indicators
  - Session flow management

#### ResultsReveal Component

- **Purpose**: Controlled winner revelation
- **Features**:
  - "Reveal Winner" buttons per category
  - Confetti animation integration
  - Progressive results display
  - Winner announcement formatting

### 3. Shared Components

#### ConfettiAnimation Component

- **Purpose**: Celebratory winner reveal effect
- **Implementation**: Canvas-based particle system or library integration
- **Trigger**: Winner reveal button click
- **Duration**: 3-5 seconds with fade-out

## Data Models

### Enhanced VotingSession Model

```typescript
interface VotingSession {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  active: boolean;
  startTime: number;
  endTime: number;
  results: Record<string, number>;
  options: string[];
  // New fields
  phase: "waiting" | "voting" | "completed" | "revealed";
  adminControlled: boolean;
}
```

### VoterState Model

```typescript
interface VoterState {
  participantId: string;
  currentCategoryId: string | null;
  hasVoted: boolean;
  selectedOption: string | null;
  viewState: "waiting" | "voting" | "voted" | "session-complete";
}
```

### CategoryResult Model

```typescript
interface CategoryResult {
  categoryId: string;
  title: string;
  description: string;
  results: Record<string, number>;
  winner: string | string[]; // Handle ties
  totalVotes: number;
  revealed: boolean;
  revealedAt?: number;
}
```

## Error Handling

### Connection Management

- **Graceful Degradation**: Show connection status to users
- **Reconnection Logic**: Automatic reconnection with state recovery
- **Offline Handling**: Queue votes when disconnected, sync on reconnection

### Vote Validation

- **Duplicate Prevention**: Server-side validation for multiple votes
- **Session Validation**: Ensure votes only accepted during active sessions
- **Data Integrity**: Validate nominee exists in current category

### State Synchronization

- **Admin-Participant Sync**: Ensure consistent state across all clients
- **Recovery Mechanisms**: Handle mid-session disconnections
- **Conflict Resolution**: Handle simultaneous admin actions

## Testing Strategy

### Unit Tests

- **Component Testing**: Individual component behavior and props
- **State Management**: Voting state transitions and validation
- **Modal Interactions**: Confirmation modal user flows
- **Animation Testing**: Confetti trigger and cleanup

### Integration Tests

- **Socket Communication**: Real-time event handling
- **Admin-Participant Flow**: End-to-end category progression
- **Vote Submission**: Complete voting workflow with confirmation
- **Results Reveal**: Winner announcement and animation sequence

### User Experience Tests

- **Mobile Responsiveness**: Touch interactions and modal behavior
- **Accessibility**: Screen reader compatibility and keyboard navigation
- **Performance**: Animation smoothness and real-time updates
- **Error Scenarios**: Network issues and recovery

## Implementation Phases

### Phase 1: Participant Experience Redesign

- Remove live results from participant view
- Implement confirmation modal
- Add post-vote status display
- Update waiting states

### Phase 2: Admin Control Enhancement

- Add category-specific start/stop controls
- Implement results-only admin view
- Add vote count monitoring
- Create session flow management

### Phase 3: Results Reveal System

- Build winner reveal interface
- Integrate confetti animations
- Add progressive results display
- Implement reveal state management

### Phase 4: Polish and Optimization

- Enhance animations and transitions
- Improve error handling and recovery
- Add accessibility features
- Performance optimization

## Technical Considerations

### Real-time Communication

- **Socket Events**: New events for admin control and state management
- **Event Sequencing**: Ensure proper order of voting/reveal events
- **Broadcast Strategy**: Separate channels for admin and participant updates

### State Management

- **Client State**: Minimal participant state, comprehensive admin state
- **Server State**: Authoritative session and results management
- **Persistence**: Database updates for category completion and results

### Animation Performance

- **Confetti Implementation**: Use requestAnimationFrame for smooth animations
- **Memory Management**: Proper cleanup of animation resources
- **Mobile Optimization**: Reduced particle count on mobile devices

### Security Considerations

- **Vote Integrity**: Prevent vote manipulation and duplicate submissions
- **Admin Authentication**: Secure admin-only actions
- **Rate Limiting**: Prevent spam voting attempts
