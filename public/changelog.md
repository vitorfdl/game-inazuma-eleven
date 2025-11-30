# Version 1.3.2 – 2025-11-30
- You can now use JP names for players by switching the language at the header of the page.
  - Thanks @rikineko on Discord for the JP names data.
- You can now switch between light and dark themes.
- Added elements interaction reference sheet button to the header of the page.
- Team Builder page:
  - Added passive calculation options to the team builder page.
  - Added conditional passives to the team builder page.
  - Added passive configuration for each slot. Thanks to [VR Calculator](https://www.reddit.com/r/inazumaeleven/comments/1p5nefv/inazuma_eleven_vr_charactershissatsuequipment/) for the passives data.
  - Passives are now automatically filtered based on those allowed for each slot.
  - Removed the "Team Comp" button and replaced it with the Team Passives button.
  - Improved the player assignment modal to be more intuitive and user-friendly.

# Version 1.2.1 - 2025-11-29

- Team Builder page:
  - Added drag-and-drop functionality to the Team Builder page, allowing you to move players between slots.
  - Improved the layout of the Team Builder page to make it more intuitive and user-friendly.
  - Fixed image export so it only includes the team layout, not the entire page.
- If you have any community-collected lists of tactics or passives, please share them in [this discussion thread](https://github.com/vitorfdl/game-inazuma-eleven/issues/3).

# Version 1.2.0 - 2025-11-29

- Team Builder Page:
  - Added staff section to the team builder page.
  - Added reserves section to the team builder page.
  - Added option to export the team as an image.

# Version 1.1.3 - 2025-11-28

- Added changelog noticeboard that surfaces the latest updates in-app.
- Team Builder Page:
  - Fixed stat increase calculations for each rarity to tested values: Normal: 1.0, Growing: 1.1, Advanced: 1.2, Top: 1.3, Legendary: 1.4, Hero: 1.67.
    Note: The correct formula for Hero require it to use the best stat spread for their position. This is not yet implemented.
  - Added shared team import and export functionality. If you want to save your team, recommended to use this feature.
- Players Page:
  - Added gender filter.
- Hissatsu Page:
  - Improved performance by reducing the initial visible count to 50.
- Improved all tables sorting to be more intuitive by clicking the column header.
- Improved all filters to be more intuitive when they are active.
- Renamed "Power" to "AT/DF" in all tables for consistency with the game glossary.

# Version 1.1.2 - 2025-11-28

- Team Builder Page:
  - Added Rarity, Beans and Equipment loadout customization to each slot.
  - Changing a player will not clear the slot's customization. Removing a player will clear the slot's customization.
  - You can now have multiple copies of the same player in different slots.
  - Added radio buttons to pick what you want to display in the slot nickname field. I'll try to improve this in the future.
- Fixed font colors in some buttons.

# Version 1.1.1 - 2025-11-27

- Added Team Builder Page
  - Favorites from players page appears first in the slot player picker list.
  - Teams are saved in the browser's local storage. Browser can delete it anytime, but it's uncommon for this to happen.
- Improved players table sorting defaults for quicker scanning.

# Version 1.1.0 - 2025-11-27

- Players Page:
  - Added favorites persistence.
  - Added auto inazugle web scrapping routine.
  - Added power calculation for players, based on formulas from [How stats actually work: a brief guide to base values](https://www.reddit.com/r/inazumaeleven/comments/1p2efdi/how_stats_actually_work_a_brief_guide_to_base/?share_id=I-tdxAr6RQ4dRk-AWM0mB&utm_content=2&utm_medium=ios_app&utm_name=ioscss&utm_source=share&utm_term=1)
- Added Hissatsu Page

# Version 1.0.0 - 2025-11-26

- Release of the Inazuma Eleven Guide wiki
