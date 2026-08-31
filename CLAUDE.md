@AGENTS.md

# Rules

- Tokens live in `app/globals.css`. Never hardcode a hex, a px font-size, or an arbitrary Tailwind value (e.g. `text-[13px]`).
- Ask before adding any dependency, font, color, or route.
- One component or section per task. Never several at once.
- When asked how something looks, screenshot it and describe what's actually in the image. Never describe from memory of the code.
- Before saying a task is done: run `npm run check`, then screenshot at 1440px and 390px and look at both.
- Don't say something looks good. Report only what's broken or off-spec.
- If the user has asked for a third adjustment to the same component, say the concept may be wrong instead of tuning further.
- For aesthetic choices, give three variants, not one recommendation.
