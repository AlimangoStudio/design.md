export const DEVICES = [
  { id: 'desktop', label: 'Desktop', width: 1440, height: 1024, icon: '▰' },
  { id: 'laptop', label: 'Laptop', width: 1280, height: 800, icon: '▱' },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024, icon: '▯' },
  { id: 'mobile', label: 'Mobile', width: 390, height: 844, icon: '▯' }
];

export const DEVICE_IDS = DEVICES.map(device => device.id);

export const BLOCK_LAYOUTS = [
  { id: 'one', label: 'One section', columns: [1], preview: '1' },
  { id: 'half', label: 'Two equal sections', columns: [1, 1], preview: '1 | 1' },
  { id: 'wide-left', label: 'Wide left', columns: [2, 1], preview: '2 | 1' },
  { id: 'wide-right', label: 'Wide right', columns: [1, 2], preview: '1 | 2' },
  { id: 'thirds', label: 'Three sections', columns: [1, 1, 1], preview: '1 | 1 | 1' }
];

export const COMPONENTS = [
  {
    id: 'heading', label: 'Heading', group: 'Text', icon: 'Aa',
    defaults: { text: 'A clear headline goes here' },
    recommended: ['dual-scramble', 'text-reveal'], allowed: ['fade-up', 'soft-reveal']
  },
  {
    id: 'text', label: 'Text', group: 'Text', icon: '¶',
    defaults: { text: 'Add supporting copy that helps people understand the idea.' },
    recommended: ['fade-up'], allowed: ['soft-reveal', 'soft-scale']
  },
  {
    id: 'button', label: 'Button', group: 'Controls', icon: '↗',
    defaults: { label: 'Get started', href: '#' },
    recommended: ['hover-lift', 'magnetic'], allowed: ['soft-reveal', 'soft-scale']
  },
  {
    id: 'image', label: 'Image', group: 'Media', icon: '▧',
    defaults: { src: '', alt: 'Project image' },
    recommended: ['image-reveal', 'soft-parallax'], allowed: ['soft-reveal', 'fade-up']
  },
  {
    id: 'card', label: 'Card', group: 'Content', icon: '▣',
    defaults: { title: 'Card title', body: 'Useful supporting information.' },
    recommended: ['hover-lift', 'tilt'], allowed: ['fade-up', 'soft-reveal']
  },
  {
    id: 'navigation', label: 'Navigation', group: 'Navigation', icon: '☰',
    defaults: { links: ['Home', 'Work', 'About', 'Contact'] },
    recommended: ['dock-reveal'], allowed: ['soft-reveal']
  },
  {
    id: 'form', label: 'Form', group: 'Forms', icon: '⌨',
    defaults: { title: 'Contact us', button: 'Send', endpoint: '/api/contact', method: 'POST' },
    recommended: ['soft-reveal'], allowed: ['fade-up']
  },
  {
    id: 'faq', label: 'FAQ', group: 'Content', icon: '?',
    defaults: { question: 'A common question', answer: 'Give a clear and useful answer.' },
    recommended: ['accordion-morph'], allowed: ['soft-reveal']
  },
  {
    id: 'stat', label: 'Number', group: 'Content', icon: '82',
    defaults: { value: '82%', label: 'Progress' },
    recommended: ['count-up'], allowed: ['fade-up', 'soft-reveal']
  },
  {
    id: 'badge', label: 'Badge', group: 'Controls', icon: '●',
    defaults: { text: 'New' },
    recommended: ['soft-scale'], allowed: ['soft-reveal']
  },
  {
    id: 'gallery', label: 'Gallery', group: 'Media', icon: '▦',
    defaults: { title: 'Selected work' },
    recommended: ['card-stack'], allowed: ['fade-up', 'soft-reveal']
  },
  {
    id: 'notice', label: 'Notice', group: 'Feedback', icon: '!',
    defaults: { title: 'Good to know', body: 'Add a short update or important message.' },
    recommended: ['soft-reveal'], allowed: ['fade-up']
  }
];

export const ANIMATIONS = [
  { id: 'fade-up', label: 'Fade up', family: 'Entrance', description: 'Gentle entrance from below.' },
  { id: 'soft-reveal', label: 'Soft reveal', family: 'Entrance', description: 'Subtle opacity and blur reveal.' },
  { id: 'soft-scale', label: 'Soft scale', family: 'Entrance', description: 'Small scale-in with a calm finish.' },
  { id: 'text-reveal', label: 'Text reveal', family: 'Text', description: 'Words arrive in a controlled sequence.' },
  { id: 'dual-scramble', label: 'Dual scramble', family: 'Text', description: 'Scramble-to-readable display text.' },
  { id: 'hover-lift', label: 'Hover lift', family: 'Interaction', description: 'Small lift on pointer hover.' },
  { id: 'magnetic', label: 'Magnetic', family: 'Interaction', description: 'Button subtly follows the pointer.' },
  { id: 'image-reveal', label: 'Image reveal', family: 'Media', description: 'Image opens with a clipped reveal.' },
  { id: 'soft-parallax', label: 'Soft parallax', family: 'Media', description: 'Small depth movement on scroll.' },
  { id: 'tilt', label: 'Tilt card', family: 'Interaction', description: 'Card tilts lightly toward the pointer.' },
  { id: 'dock-reveal', label: 'Dock reveal', family: 'Navigation', description: 'Navigation settles into view.' },
  { id: 'accordion-morph', label: 'Accordion morph', family: 'Content', description: 'FAQ opens with a smooth morph.' },
  { id: 'count-up', label: 'Count up', family: 'Numbers', description: 'Numeric content resolves upward.' },
  { id: 'card-stack', label: 'Card stack', family: 'Media', description: 'Gallery cards settle as a stack.' }
];

export const PAGE_EFFECTS = [
  { id: 'none', label: 'Normal', description: 'No special page behavior.' },
  { id: 'section-reveal', label: 'Section reveal', description: 'Reveal this block as it enters the page.' },
  { id: 'sticky', label: 'Sticky story', description: 'Hold the block briefly while content moves.' },
  { id: 'parallax', label: 'Soft parallax', description: 'Add restrained depth during scroll.' }
];

export const TYPOGRAPHY_PRESETS = [
  { id: 'modern', label: 'Modern', heading: 'Inter, ui-sans-serif, system-ui, sans-serif', body: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { id: 'minimal', label: 'Minimal', heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
  { id: 'editorial', label: 'Editorial', heading: 'Georgia, Times, serif', body: 'Georgia, Times, serif' },
  { id: 'luxury', label: 'Luxury', heading: 'Georgia, Times, serif', body: 'Arial, Helvetica, sans-serif' },
  { id: 'playful', label: 'Playful', heading: 'Trebuchet MS, Arial, sans-serif', body: 'Trebuchet MS, Arial, sans-serif' },
  { id: 'technical', label: 'Technical', heading: 'ui-monospace, SFMono-Regular, Menlo, monospace', body: 'ui-sans-serif, system-ui, sans-serif' }
];

export function componentDefinition(type) {
  return COMPONENTS.find(item => item.id === type);
}

export function animationDefinition(id) {
  return ANIMATIONS.find(item => item.id === id);
}

export function animationsForComponent(type) {
  const definition = componentDefinition(type);
  if (!definition) return { recommended: [], allowed: [] };
  return {
    recommended: definition.recommended.map(animationDefinition).filter(Boolean),
    allowed: definition.allowed.map(animationDefinition).filter(Boolean)
  };
}

export function isAnimationCompatible(type, animationId) {
  const definition = componentDefinition(type);
  return Boolean(definition && [...definition.recommended, ...definition.allowed].includes(animationId));
}

export function layoutDefinition(id) {
  return BLOCK_LAYOUTS.find(item => item.id === id) || BLOCK_LAYOUTS[0];
}
