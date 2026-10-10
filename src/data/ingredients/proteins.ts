// Meat, poultry and seafood. Per 100 g edible portion, USDA FoodData Central (SR Legacy),
// raw unless the id says otherwise. Lean cuts are "separable lean only".
import type { Ingredient } from '../../types.ts';

export const ingredients: Ingredient[] = [
  // ---------- Lamb and goat ----------
  // USDA SR Legacy 17013: Lamb, leg, whole (shank and sirloin), separable lean only, trimmed to 1/4" fat, choice, raw
  { id: 'lamb-leg-lean-raw', name: 'Lamb leg, lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 128, protein: 20.6, carbs: 0, fiber: 0, sugars: 0, fat: 4.51, satFat: 1.61, sodium: 62 },
    halalNote: 'Buy halal (zabiha) lamb.' },
  // USDA SR Legacy 17013: Lamb, leg, whole (shank and sirloin), separable lean only, trimmed to 1/4" fat, choice, raw
  // (same food as lamb-leg-lean-raw: ask the butcher to mince trimmed leg)
  { id: 'lamb-ground-lean-raw', name: 'Ground lamb, lean (minced leg, raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 128, protein: 20.6, carbs: 0, fiber: 0, sugars: 0, fat: 4.51, satFat: 1.61, sodium: 62 },
    halalNote: 'Buy halal (zabiha) lamb.' },
  // USDA SR Legacy 17224: Lamb, ground, raw
  { id: 'lamb-ground-raw', name: 'Ground lamb, regular (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 282, protein: 16.6, carbs: 0, fiber: 0, sugars: 0, fat: 23.4, satFat: 10.2, sodium: 59 },
    halalNote: 'Buy halal (zabiha) lamb.' },
  // USDA SR Legacy 17039: Lamb, shoulder, whole (arm and blade), separable lean only, trimmed to 1/4" fat, choice, raw
  { id: 'lamb-shoulder-lean-raw', name: 'Lamb shoulder, lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 144, protein: 19.6, carbs: 0, fiber: 0, sugars: 0, fat: 6.76, satFat: 2.42, sodium: 70 },
    halalNote: 'Buy halal (zabiha) lamb.' },
  // USDA SR Legacy 17059: Lamb, cubed for stew or kabob (leg and shoulder), separable lean only, trimmed to 1/4" fat, raw
  { id: 'lamb-cubes-lean-raw', name: 'Lamb cubes for stew or kebab, lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 134, protein: 20.2, carbs: 0, fiber: 0, sugars: 0, fat: 5.28, satFat: 1.89, sodium: 65 },
    halalNote: 'Buy halal (zabiha) lamb.' },
  // USDA SR Legacy 17009: Lamb, foreshank, separable lean only, trimmed to 1/4" fat, choice, raw (meat, without bone)
  { id: 'lamb-shank-lean-raw', name: 'Lamb shank meat, lean (raw, off the bone)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 120, protein: 21.1, carbs: 0, fiber: 0, sugars: 0, fat: 3.29, satFat: 1.18, sodium: 79 },
    halalNote: 'Buy halal (zabiha) lamb.' },
  // USDA SR Legacy 17026: Lamb, loin, separable lean only, trimmed to 1/4" fat, choice, raw
  { id: 'lamb-loin-lean-raw', name: 'Lamb loin, lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 143, protein: 20.9, carbs: 0, fiber: 0, sugars: 0, fat: 5.94, satFat: 2.13, sodium: 68 },
    halalNote: 'Buy halal (zabiha) lamb.' },
  // USDA SR Legacy 17199: Lamb, variety meats and by-products, liver, raw
  { id: 'lamb-liver-raw', name: 'Lamb liver (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 139, protein: 20.4, carbs: 1.78, fiber: 0, sugars: 0, fat: 5.02, satFat: 1.94, sodium: 70 },
    halalNote: 'Buy halal (zabiha) lamb liver.' },
  // USDA SR Legacy 17168: Game meat, goat, raw
  { id: 'goat-raw', name: 'Goat meat (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 109, protein: 20.6, carbs: 0, fiber: 0, sugars: 0, fat: 2.31, satFat: 0.71, sodium: 82 },
    halalNote: 'Buy halal (zabiha) goat.' },

  // ---------- Beef ----------
  // USDA SR Legacy 23611: Beef, top sirloin, steak, separable lean only, trimmed to 1/8" fat, all grades, raw
  { id: 'beef-sirloin-lean-raw', name: 'Beef sirloin, lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 131, protein: 22.1, carbs: 0, fiber: 0, sugars: 0, fat: 4.08, satFat: 1.51, sodium: 56 },
    halalNote: 'Buy halal (zabiha) beef.' },
  // USDA SR Legacy 23354: Beef, round, top round steak, boneless, separable lean only, trimmed to 0" fat, all grades, raw
  { id: 'beef-round-lean-raw', name: 'Beef top round, lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 121, protein: 23.6, carbs: 0, fiber: 0, sugars: 0, fat: 2.94, satFat: 1.12, sodium: 54 },
    halalNote: 'Buy halal (zabiha) beef.' },
  // USDA SR Legacy 23656: Beef, flank, steak, separable lean only, trimmed to 0" fat, all grades, raw
  { id: 'beef-flank-lean-raw', name: 'Beef flank steak, lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 141, protein: 21.6, carbs: 0, fiber: 0, sugars: 0, fat: 5.47, satFat: 2.06, sodium: 55 },
    halalNote: 'Buy halal (zabiha) beef.' },
  // USDA SR Legacy 23372: Beef, loin, tenderloin steak, boneless, separable lean only, trimmed to 0" fat, all grades, raw
  { id: 'beef-tenderloin-lean-raw', name: 'Beef tenderloin, lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 139, protein: 21.9, carbs: 0, fiber: 0, sugars: 0, fat: 5.74, satFat: 1.96, sodium: 44 },
    halalNote: 'Buy halal (zabiha) beef.' },
  // USDA SR Legacy 23093: Beef, chuck for stew, separable lean and fat, all grades, raw (trimmed retail stew
  // cubes; the lean-and-fat figure is only 4.5 g fat, hence "lean" in the id)
  { id: 'beef-stew-lean-raw', name: 'Beef chuck stew meat, lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 128, protein: 21.8, carbs: 0.16, fiber: 0, sugars: 0, fat: 4.48, satFat: 1.86, sodium: 80 },
    halalNote: 'Buy halal (zabiha) beef.' },
  // USDA SR Legacy 23557: Beef, ground, 95% lean meat / 5% fat, raw
  { id: 'beef-ground-95-raw', name: 'Ground beef, 95% lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 137, protein: 21.4, carbs: 0, fiber: 0, sugars: 0, fat: 5, satFat: 2.18, sodium: 66 },
    halalNote: 'Buy halal (zabiha) beef.' },
  // USDA SR Legacy 23562: Beef, ground, 90% lean meat / 10% fat, raw
  { id: 'beef-ground-90-raw', name: 'Ground beef, 90% lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 176, protein: 20, carbs: 0, fiber: 0, sugars: 0, fat: 10, satFat: 3.93, sodium: 66 },
    halalNote: 'Buy halal (zabiha) beef.' },
  // USDA SR Legacy 23567: Beef, ground, 85% lean meat / 15% fat, raw
  { id: 'beef-ground-85-raw', name: 'Ground beef, 85% lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 215, protein: 18.6, carbs: 0, fiber: 0, sugars: 0, fat: 15, satFat: 5.72, sodium: 66 },
    halalNote: 'Buy halal (zabiha) beef.' },
  // USDA SR Legacy 13325: Beef, variety meats and by-products, liver, raw
  { id: 'beef-liver-raw', name: 'Beef liver (raw)', aisle: 'meat-poultry', allergens: [], animal: 'meat',
    per100g: { kcal: 135, protein: 20.4, carbs: 3.89, fiber: 0, sugars: 0, fat: 3.63, satFat: 1.23, sodium: 69 },
    halalNote: 'Buy halal (zabiha) beef liver.' },

  // ---------- Chicken and turkey ----------
  // USDA SR Legacy 05062: Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw
  { id: 'chicken-breast-raw', name: 'Chicken breast, skinless (raw)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 120, protein: 22.5, carbs: 0, fiber: 0, sugars: 0, fat: 2.62, satFat: 0.563, sodium: 45 },
    halalNote: 'Buy halal (zabiha) chicken.' },
  // USDA SR Legacy 05064: Chicken, broilers or fryers, breast, meat only, cooked, roasted
  { id: 'chicken-breast-roasted', name: 'Chicken breast, skinless (roasted)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 165, protein: 31, carbs: 0, fiber: 0, sugars: 0, fat: 3.57, satFat: 1.01, sodium: 74 },
    halalNote: 'Buy halal (zabiha) chicken.' },
  // USDA SR Legacy 05096: Chicken, broilers or fryers, dark meat, thigh, meat only, raw
  { id: 'chicken-thigh-boneless-raw', name: 'Chicken thigh, skinless, boneless (raw)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 121, protein: 19.7, carbs: 0, fiber: 0, sugars: 0, fat: 4.12, satFat: 1.1, sodium: 95 },
    halalNote: 'Buy halal (zabiha) chicken.' },
  // USDA SR Legacy 05096: Chicken, broilers or fryers, dark meat, thigh, meat only, raw; scaled x0.75 because
  // this entry is weighed with the bone (bone is about 25% of a skinless bone-in thigh)
  { id: 'chicken-thigh-bone-in-raw', name: 'Chicken thigh, skinless, bone-in (raw, weighed with bone)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 91, protein: 14.8, carbs: 0, fiber: 0, sugars: 0, fat: 3.09, satFat: 0.83, sodium: 71 },
    halalNote: 'Buy halal (zabiha) chicken.' },
  // USDA SR Legacy 05332: Chicken, ground, raw
  { id: 'chicken-ground-raw', name: 'Ground chicken (raw)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 143, protein: 17.4, carbs: 0.04, fiber: 0, sugars: 0, fat: 8.1, satFat: 2.3, sodium: 60 },
    halalNote: 'Buy halal (zabiha) chicken.' },
  // USDA SR Legacy 05027: Chicken, liver, all classes, raw
  { id: 'chicken-liver-raw', name: 'Chicken liver (raw)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 119, protein: 16.9, carbs: 0.73, fiber: 0, sugars: 0, fat: 4.83, satFat: 1.56, sodium: 71 },
    halalNote: 'Buy halal (zabiha) chicken livers.' },
  // USDA SR Legacy 05710: Turkey, retail parts, breast, meat only, raw
  { id: 'turkey-breast-raw', name: 'Turkey breast, skinless (raw)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 114, protein: 23.3, carbs: 0, fiber: 0, sugars: 0, fat: 2.33, satFat: 0.344, sodium: 74 },
    halalNote: 'Buy halal (zabiha) turkey.' },
  // USDA SR Legacy 05665: Turkey, ground, 93% lean, 7% fat, raw
  { id: 'turkey-ground-93-raw', name: 'Ground turkey, 93% lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 150, protein: 18.7, carbs: 0, fiber: 0, sugars: 0, fat: 8.34, satFat: 2.17, sodium: 69 },
    halalNote: 'Buy halal (zabiha) turkey.' },
  // USDA SR Legacy 05662: Turkey, ground, fat free, raw
  { id: 'turkey-ground-extra-lean-raw', name: 'Ground turkey breast, extra-lean (raw)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 112, protein: 23.6, carbs: 0, fiber: 0, sugars: 0, fat: 1.95, satFat: 0.487, sodium: 51 },
    halalNote: 'Buy halal (zabiha) turkey.' },

  // ---------- Fish and seafood (fillets are the edible portion) ----------
  // USDA SR Legacy 15008: Fish, carp, raw
  { id: 'carp-raw', name: 'Carp fillet (raw)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 127, protein: 17.8, carbs: 0, fiber: 0, sugars: 0, fat: 5.6, satFat: 1.08, sodium: 49 } },
  // USDA SR Legacy 15261: Fish, tilapia, raw
  { id: 'tilapia-raw', name: 'Tilapia fillet (raw)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 96, protein: 20.1, carbs: 0, fiber: 0, sugars: 0, fat: 1.7, satFat: 0.585, sodium: 52 } },
  // USDA SR Legacy 15091: Fish, sea bass, mixed species, raw
  { id: 'sea-bass-raw', name: 'Sea bass fillet (raw)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 97, protein: 18.4, carbs: 0, fiber: 0, sugars: 0, fat: 2, satFat: 0.511, sodium: 68 } },
  // USDA SR Legacy 15015: Fish, cod, Atlantic, raw
  { id: 'cod-raw', name: 'Cod fillet (raw)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 82, protein: 17.8, carbs: 0, fiber: 0, sugars: 0, fat: 0.67, satFat: 0.131, sodium: 54 } },
  // USDA SR Legacy 15240: Fish, trout, rainbow, farmed, raw
  { id: 'trout-raw', name: 'Rainbow trout fillet (raw)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 141, protein: 19.9, carbs: 0, fiber: 0, sugars: 0, fat: 6.18, satFat: 1.38, sodium: 51 } },
  // USDA SR Legacy 15236: Fish, salmon, Atlantic, farmed, raw (what shops sell as Atlantic salmon)
  { id: 'salmon-atlantic-raw', name: 'Salmon fillet, Atlantic (raw)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 208, protein: 20.4, carbs: 0, fiber: 0, sugars: 0, fat: 13.4, satFat: 3.05, sodium: 59 } },
  // USDA SR Legacy 15046: Fish, mackerel, Atlantic, raw
  { id: 'mackerel-raw', name: 'Mackerel fillet, Atlantic (raw)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 205, protein: 18.6, carbs: 0, fiber: 0, sugars: 0, fat: 13.9, satFat: 3.26, sodium: 90 } },
  // USDA SR Legacy 15127: Fish, tuna, fresh, yellowfin, raw
  { id: 'tuna-yellowfin-raw', name: 'Tuna steak, yellowfin (raw)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 109, protein: 24.4, carbs: 0, fiber: 0, sugars: 0, fat: 0.49, satFat: 0.172, sodium: 45 } },
  // USDA SR Legacy 15121: Fish, tuna, light, canned in water, drained solids
  { id: 'tuna-canned-water-drained', name: 'Tuna, canned in water (drained)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 86, protein: 19.4, carbs: 0, fiber: 0, sugars: 0, fat: 0.96, satFat: 0.211, sodium: 247 } },
  // USDA SR Legacy 15184: Fish, tuna, light, canned in water, without salt, drained solids
  { id: 'tuna-canned-water-no-salt-drained', name: 'Tuna, canned in water, no salt added (drained)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 116, protein: 25.5, carbs: 0, fiber: 0, sugars: 0, fat: 0.82, satFat: 0.234, sodium: 50 } },
  // USDA SR Legacy 15119: Fish, tuna, light, canned in oil, drained solids
  { id: 'tuna-canned-oil-drained', name: 'Tuna, canned in oil (drained)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 198, protein: 29.1, carbs: 0, fiber: 0, sugars: 0, fat: 8.21, satFat: 1.53, sodium: 416 } },
  // USDA SR Legacy 15260: Fish, salmon, pink, canned, drained solids
  { id: 'salmon-canned-drained', name: 'Pink salmon, canned (drained)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 138, protein: 23.1, carbs: 0, fiber: 0, sugars: 0, fat: 5.02, satFat: 0.895, sodium: 381 } },
  // USDA SR Legacy 15088: Fish, sardine, Atlantic, canned in oil, drained solids with bone
  { id: 'sardines-canned-oil-drained', name: 'Sardines, canned in oil (drained)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 208, protein: 24.6, carbs: 0, fiber: 0, sugars: 0, fat: 11.4, satFat: 1.53, sodium: 307 } },
  // USDA SR Legacy 15270: Crustaceans, shrimp, raw
  { id: 'shrimp-raw', name: 'Shrimp, peeled (raw)', aisle: 'seafood', allergens: ['shellfish'], animal: 'shellfish',
    per100g: { kcal: 85, protein: 20.1, carbs: 0, fiber: 0, sugars: 0, fat: 0.51, satFat: 0.101, sodium: 119 },
    halalNote: 'Shrimp is halal for most scholars; some Hanafi scholars consider it disliked (makruh).' },

  // ---------- Shared staples added for the library expansion ----------
  // USDA SR Legacy 05071: Chicken, broilers or fryers, dark meat, drumstick, meat only, raw; scaled x0.67 because
  // this entry is weighed with the bone (bone is about a third of a skinless bone-in drumstick)
  { id: 'chicken-drumstick-bone-in-raw', name: 'Chicken drumstick, skinless, bone-in (raw, weighed with bone)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 78, protein: 13, carbs: 0, fiber: 0, sugars: 0, fat: 2.49, satFat: 0.64, sodium: 76 },
    halalNote: 'Buy halal (zabiha) chicken.' },
  // USDA SR Legacy 05011: Chicken, broilers or fryers, meat only, raw; scaled x0.70 because this entry is a
  // skinless chicken cut into bone-in pieces (or a skinless whole bird), weighed with the bone (about 30% bone)
  { id: 'chicken-pieces-bone-in-raw', name: 'Chicken pieces, skinless, bone-in (raw, weighed with bone)', aisle: 'meat-poultry', allergens: [], animal: 'poultry',
    per100g: { kcal: 83, protein: 15, carbs: 0, fiber: 0, sugars: 0, fat: 2.16, satFat: 0.55, sodium: 54 },
    halalNote: 'Buy halal (zabiha) chicken.' },
  // USDA SR Legacy 15101: Fish, snapper, mixed species, raw
  { id: 'snapper-raw', name: 'Snapper fillet (raw)', aisle: 'seafood', allergens: ['fish'], animal: 'fish',
    per100g: { kcal: 100, protein: 20.5, carbs: 0, fiber: 0, sugars: 0, fat: 1.34, satFat: 0.285, sodium: 64 } },
];
