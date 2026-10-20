# What "healthy" means in Sufra

Every recipe in the library has to pass these rules; `src/data/validate.ts` enforces them and `pnpm test` fails on
any recipe that doesn't. `node --experimental-strip-types scripts/health-audit.mjs` lists the recipes that break a
rule, by chunk. This page is the reasoning, with the evidence each rule rests on.

## The evidence

- **WHO, Healthy diet (fact sheet 394).** Free sugars under 10% of energy, preferably under 5% (about 25 g a day at
  2,000 kcal; WHO's 2015 sugars guideline). Saturated fat under 10% of energy, trans fat under 1%. Salt under 5 g a
  day (2,000 mg sodium). At least 400 g of fruit and vegetables a day, not counting potatoes and other starchy roots.
- **Harvard T.H. Chan School of Public Health, Healthy Eating Plate.** Half the plate vegetables and fruit (potatoes
  don't count), a quarter whole grains, a quarter healthy protein. Whole and intact grains (brown rice, whole wheat,
  barley, oats, quinoa) over refined ones (white rice, white bread), which act much like sugar. Fish, poultry, beans
  and nuts first; limit red meat; avoid processed meat.
- **Yu et al., BMJ Open 2022, white rice, brown rice and type 2 diabetes (systematic review and meta-analysis).**
  Highest white rice intake: 16% higher risk of type 2 diabetes; brown rice: 11% lower. The authors suggest swapping
  white rice for brown rice or other whole grains as a cheap, practical step.
- **World Cancer Research Fund, Cancer Prevention Recommendations.** No more than about three portions of red meat a
  week, 350-500 g cooked (700-750 g raw), and little if any processed meat (a group 1 carcinogen, IARC 2015).
- **Qin et al., Heart 2021 (meta-analysis of fried food).** Most against least fried food: 28% more major
  cardiovascular events, 22% more coronary heart disease, 37% more heart failure, rising with every weekly serving.
- **NHS 5 A Day portion rules** for counting fruit and vegetables: an 80 g portion; beans and lentils count once
  however much you eat; 30 g of dried fruit is a portion and counts once; potatoes, yams, cassava and plantain don't
  count.

## The rules (per serving, at portion 1)

| | breakfast | lunch / dinner | snack |
|---|---|---|---|
| kcal | 250-650 | 350-800 | 80-350 |
| protein at least | 10 g | 15 g | none |
| fiber at least | 4 g | 5 g | none |
| fruit and vegetables at least | 80 g | 120 g | none |
| sodium at most | 600 mg | 800 mg | 300 mg |
| free sugar at most | 8 g | 5 g | 8 g |

The fruit and vegetable minimums add up, with a snack, to WHO's 400 g a day; the free sugar limits add up to about
26 g, WHO's "preferably under 5%" at 2,000 kcal. The planner keeps the day's sodium to a soft 2,000 mg budget.

For every recipe:

- **Saturated fat at most 10% of energy** (WHO). A warning above 8%.
- **Whole grains.** Refined grain (white rice of any kind, white flour, semolina, vermicelli, white pasta and
  noodles, filo, pearled barley) is allowed as a dusting or thickener, up to 10 g a serving. Above that the recipe
  has to say why a whole grain would ruin the dish (`refinedGrain`, e.g. dolma filling that has to hold together), and
  it is capped at 45 g dry (about 120 g cooked rice). Everything else uses brown or wild rice, bulgur, freekeh, oats,
  quinoa, whole-wheat flour, bread and pasta.
- **Red meat at most 120 g raw a serving** (about 85 g cooked, one WCRF portion), and only lean cuts. No processed meat.
  The planner keeps red meat to about 600 g raw over any 7 days.
- **No deep- or shallow-frying.** Bake, grill, roast, steam, braise, or sauté in a measured spoon of oil.
- **Free sugar** is sugar, honey, syrups, molasses, jam and fruit juice. Whole fruit, dried fruit and the sugar in
  milk are not free sugar (WHO). Desserts are made with fruit, nuts, yogurt and dates, and stay within the snack limit.

## Videos

Every recipe's reference video comes from a trusted channel: one YouTube has verified, or one with at least 100,000
subscribers, that is a cooking channel. `node scripts/videos/search.mjs "<dish> recipe"` lists candidates with their
standing; `node scripts/videos/audit.mjs` re-checks every video in `src/data/videos.ts`. When no trusted video
exists in any language for a dish, the recipe has no video and the app offers a YouTube search instead.

## Sources

- WHO, Healthy diet, fact sheet 394: https://www.who.int/publications/m/item/healthy-diet-factsheet394
- WHO, Guideline: sugars intake for adults and children (2015), summarized in BMJ 2015;350:h1261:
  https://www.bmj.com/content/350/bmj.h1261
- Harvard T.H. Chan School of Public Health, Healthy Eating Plate:
  https://nutritionsource.hsph.harvard.edu/healthy-eating-plate/
- Yu J, Balaji B, Tinajero M, et al. White rice, brown rice and the risk of type 2 diabetes: a systematic review and
  meta-analysis. BMJ Open 2022;12:e065426: https://bmjopen.bmj.com/content/12/9/e065426
- World Cancer Research Fund, Limit red and processed meat: https://www.wcrf.org/dietandcancer/limit-red-and-processed-meat/
- Qin P, Zhang M, Han M, et al. Fried-food consumption and risk of cardiovascular disease and all-cause mortality: a
  meta-analysis of observational studies. Heart 2021;107:1567-75: https://doi.org/10.1136/heartjnl-2020-317883
- NHS, 5 A Day portion sizes: https://www.nhs.uk/live-well/eat-well/5-a-day/portion-sizes/
