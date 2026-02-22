/**
 * Common AI-generated testimonial phrases and attribution patterns.
 *
 * Tiered by specificity:
 * - Tier 1 (weight 3): Highly generic phrases almost never seen in real testimonials
 * - Tier 2 (weight 2): Common AI filler phrases
 * - Tier 3 (weight 1): Soft indicators (might appear naturally)
 */
export const TESTIMONIAL_PHRASES = {
    "hyper-generic": {
        weight: 3,
        phrases: [
            /changed my life/i,
            /game[\s-]?changer/i,
            /couldn't imagine going back/i,
            /can't imagine going back/i,
            /exceeded all (?:my|our) expectations/i,
            /best (?:decision|investment) (?:I|we)(?:'ve)? ever made/i,
            /wish I had (?:found|discovered|started) (?:this|it) sooner/i,
            /transformed (?:my|our) (?:workflow|business|life|company|team)/i,
            /absolutely love (?:this|it|everything)/i,
            /highly recommend (?:this|it|them) to (?:anyone|everyone)/i,
            /took (?:my|our) .{1,20} to the next level/i,
            /nothing short of (?:amazing|incredible|remarkable)/i,
        ],
    },
    "ai-filler": {
        weight: 2,
        phrases: [
            /revolutionized the way/i,
            /10\/10 would recommend/i,
            /a must[\s-]?have for/i,
            /seamless(?:ly)? integrat/i,
            /intuitive and easy to use/i,
            /blown away by/i,
            /incredible (?:experience|product|tool|service|platform)/i,
            /streamlined (?:my|our) (?:workflow|process|operations)/i,
            /exactly what (?:I|we) (?:was|were) looking for/i,
            /worth every (?:penny|cent|dollar)/i,
            /saved (?:us|me) (?:countless|so many) hours/i,
            /the support team is (?:amazing|incredible|outstanding|phenomenal)/i,
        ],
    },
    "soft-indicator": {
        weight: 1,
        phrases: [
            /powerful (?:tool|platform|solution)/i,
            /easy to (?:set up|get started|use)/i,
            /love (?:how|the way|that)/i,
            /impressive/i,
            /outstanding/i,
            /exceptional/i,
            /five stars?/i,
            /5 stars?/i,
        ],
    },
};
/**
 * Attribution patterns that suggest fake testimonials.
 * Matches "- Name, Title" or "Name, Title at Company" patterns.
 */
export const ATTRIBUTION_PATTERNS = [
    // "— John D., CEO at TechCorp" or "- Sarah M., Product Manager"
    /[-—]\s*[A-Z][a-z]+\s+[A-Z]\.,?\s+(?:CEO|CTO|COO|CFO|CMO|VP|Director|Manager|Founder|Co-founder|Head of|Lead|Senior|Engineer|Designer)/i,
    // "John Smith, CEO" (simple name + title)
    /[A-Z][a-z]+\s+[A-Z][a-z]+,?\s+(?:CEO|CTO|COO|CFO|CMO|VP|Director|Manager|Founder|Co-founder)/i,
    // Star rating indicators
    /[★⭐]{3,5}/,
    /★{3,5}/,
];
//# sourceMappingURL=testimonial-phrases.js.map