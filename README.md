# EDAV Midterm Practice

Interactive practice for the STAT GR5702 (Exploratory Data Analysis & Visualization) midterm.

**Use it:** open `index.html` in any browser. It's one self-contained file, so it works offline.

## Features
- **Practice:** random questions by topic, including freshly generated plot and data questions (histograms, boxplots, QQ plots, mosaic plots, parallel coordinates, and more). Each answer comes with an explanation.
- **Review missed:** go back over questions you got wrong.
- **Mock exam:** 33 questions with the real exam's topic mix and a 75-minute timer.
- **Sample midterm:** the 2026 sample midterm with an answer key and explanations.
- **Cheat sheet**
- **Stats:** accuracy by topic. Progress is saved in your browser's localStorage, and you can reset it from the Stats tab.

Keyboard: `A`–`D` or `1`–`4` to answer; `Enter`, `N` or `→` for the next question.

## Building from source
```
python3 src/build.py   # writes index.html
```
- `src/bank.js`: static question bank
- `src/sample.js`: sample midterm questions
- `src/gen.js`: random question generators
- `src/app.js`: UI logic
- `src/template.html`: page and styles
