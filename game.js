function handleGame(ctx) {
  const outcomes = [
    "🚀 You found a star fragment! +5 points!",
    "🌌 You drifted through the void... nothing found.",
    "🪐 You discovered a new planet! +10 points!",
    "☄️ You were hit by an asteroid! Lost 2 points.",
  ];

  const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
  ctx.reply(randomOutcome);
}

module.exports = { handleGame };
