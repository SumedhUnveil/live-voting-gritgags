# ConfettiAnimation Component

A customizable confetti animation component built with HTML5 Canvas for celebrating winner reveals in the voting application.

## Features

- **Canvas-based Animation**: Smooth, performant particle system using HTML5 Canvas
- **Customizable Colors**: Support for custom color schemes
- **Configurable Duration**: Adjustable animation duration
- **Particle Count Control**: Customizable number of confetti particles
- **Memory Management**: Proper cleanup and resource management
- **Mobile Optimized**: Responsive design with touch-friendly interactions
- **Accessibility**: Non-intrusive overlay that doesn't interfere with screen readers

## Usage

### Basic Usage

```tsx
import { ConfettiAnimation } from "../components";

function WinnerReveal() {
  const [showConfetti, setShowConfetti] = useState(false);

  const handleRevealWinner = () => {
    setShowConfetti(true);
  };

  const handleConfettiComplete = () => {
    setShowConfetti(false);
  };

  return (
    <div className="relative">
      <button onClick={handleRevealWinner}>Reveal Winner</button>

      <ConfettiAnimation
        isActive={showConfetti}
        onComplete={handleConfettiComplete}
      />
    </div>
  );
}
```

### Advanced Usage with Custom Configuration

```tsx
import { ConfettiAnimation } from "../components";
import { CONFETTI_CONFIG } from "../../types/constants";

function CustomConfetti() {
  const [showConfetti, setShowConfetti] = useState(false);

  return (
    <div className="relative">
      <ConfettiAnimation
        isActive={showConfetti}
        duration={3000}
        particleCount={150}
        colors={["#FFD700", "#FF6B6B", "#4ECDC4"]}
        onComplete={() => setShowConfetti(false)}
      />
    </div>
  );
}
```

## Props

| Prop            | Type         | Default                  | Description                                             |
| --------------- | ------------ | ------------------------ | ------------------------------------------------------- |
| `isActive`      | `boolean`    | -                        | **Required.** Controls whether the animation is running |
| `duration`      | `number`     | `5000`                   | Animation duration in milliseconds                      |
| `particleCount` | `number`     | `100`                    | Number of confetti particles to generate                |
| `colors`        | `string[]`   | `CONFETTI_CONFIG.colors` | Array of hex color codes for particles                  |
| `onComplete`    | `() => void` | -                        | Callback fired when animation completes                 |

## Default Configuration

The component uses default values from `CONFETTI_CONFIG`:

```typescript
export const CONFETTI_CONFIG = {
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ["#7ebd41", "#4c4c4c", "#FFD700", "#FF6B6B", "#4ECDC4"],
  duration: 5000,
} as const;
```

## Animation Physics

The confetti particles follow realistic physics:

- **Initial Velocity**: Random velocity with upward trajectory
- **Gravity**: Particles fall naturally with configurable gravity
- **Rotation**: Each particle rotates at different speeds
- **Fade Out**: Particles fade based on remaining life
- **Spread Pattern**: Particles spread from center with random angles

## Performance Considerations

- Uses `requestAnimationFrame` for smooth 60fps animation
- Automatic cleanup prevents memory leaks
- Canvas resizing handled efficiently
- Particle filtering removes dead particles from memory
- Mobile-optimized particle counts

## Browser Compatibility

- **Modern Browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **Canvas Support**: Requires HTML5 Canvas support
- **Animation API**: Uses `requestAnimationFrame` (IE10+)

## Integration with ResultsReveal

The component is integrated into the `ResultsReveal` component:

```tsx
// In ResultsReveal.tsx
const handleRevealWinner = useCallback(
  (categoryId: string) => {
    setRevealedCategories(
      (prev) => new Set(Array.from(prev).concat(categoryId))
    );

    // Trigger confetti animation
    setShowConfetti(true);

    onRevealWinner(categoryId);
  },
  [onRevealWinner]
);

// Render confetti
<ConfettiAnimation
  isActive={showConfetti}
  onComplete={handleConfettiComplete}
/>;
```

## Testing

The component includes comprehensive tests:

- Unit tests for component rendering and props
- Integration tests with ResultsReveal component
- Animation lifecycle testing
- Memory cleanup verification

Run tests with:

```bash
npm test ConfettiAnimation
```

## Accessibility

- Uses `pointer-events-none` to avoid interfering with interactions
- High z-index ensures visibility without blocking content
- Non-intrusive animation that doesn't affect screen readers
- Respects user preferences for reduced motion (can be extended)

## Customization Examples

### Gold Theme

```tsx
<ConfettiAnimation
  isActive={true}
  colors={["#FFD700", "#FFA500", "#FF8C00", "#DAA520"]}
/>
```

### Quick Burst

```tsx
<ConfettiAnimation isActive={true} duration={2000} particleCount={50} />
```

### Rainbow Celebration

```tsx
<ConfettiAnimation
  isActive={true}
  colors={["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]}
  particleCount={200}
/>
```

## Future Enhancements

Potential improvements for future versions:

- Particle shape variations (circles, stars, custom shapes)
- Sound effects integration
- Particle trails and effects
- Multiple animation patterns
- Performance monitoring and adaptive quality
- Reduced motion accessibility support
