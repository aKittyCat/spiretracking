// Database of Ingredients (จากไฟล์ Tracker.csv)
const INGREDIENTS_DB = [
    { name: "Boon Shard", combat: 0, utility: 0, whimsy: 0, rarity: "VR" },
    { name: "Amber", combat: 9, utility: 5, whimsy: 4, rarity: "C" },
    { name: "Apper Carrot", combat: 0, utility: 3, whimsy: 1, rarity: "C" },
    { name: "Bamboo", combat: 3, utility: 3, whimsy: 3, rarity: "C" },
    { name: "Bashu Powder", combat: 2, utility: 0, whimsy: 0, rarity: "C" },
    { name: "Black Cinnamon", combat: 16, utility: 12, whimsy: 11, rarity: "U" },
    { name: "Black Pearl", combat: 13, utility: 14, whimsy: 15, rarity: "U" },
    { name: "Blossom of Spirit Vine", combat: 18, utility: 18, whimsy: 19, rarity: "R" },
    { name: "Blue Back Salmon", combat: 3, utility: 4, whimsy: 7, rarity: "C" },
    { name: "Boom Beri", combat: 7, utility: 6, whimsy: 1, rarity: "C" },
    { name: "Bora Bug", combat: 4, utility: 8, whimsy: 3, rarity: "C" },
    { name: "Brush Reed", combat: 1, utility: 10, whimsy: 6, rarity: "C" },
    { name: "Bundle of Driko Twigs", combat: 1, utility: 1, whimsy: 2, rarity: "C" },
    { name: "Camp Mite", combat: 6, utility: 4, whimsy: 8, rarity: "C" },
    { name: "Chicken Egg", combat: 1, utility: 1, whimsy: 2, rarity: "C" },
    { name: "Chisuay's Heavenly Tea", combat: 2, utility: 7, whimsy: 5, rarity: "C" },
    { name: "Clay Snake Tail", combat: 8, utility: 6, whimsy: 5, rarity: "C" },
    { name: "Cloud Horn", combat: 1, utility: 0, whimsy: 0, rarity: "C" },
    { name: "Creeping Bolete", combat: 3, utility: 10, whimsy: 6, rarity: "C" },
    { name: "Dorrin Plate", combat: 7, utility: 8, whimsy: 4, rarity: "C" },
    { name: "Dried Fruit", combat: 2, utility: 1, whimsy: 4, rarity: "C" },
    { name: "Earwax", combat: 0, utility: 0, whimsy: 0, rarity: "C" },
    { name: "Fish Folk Tooth", combat: 9, utility: 4, whimsy: 3, rarity: "C" },
    { name: "Fish Head", combat: 4, utility: 5, whimsy: 4, rarity: "C" },
    { name: "Flash Paper", combat: 6, utility: 9, whimsy: 1, rarity: "C" },
    { name: "Gohaku Rice", combat: 3, utility: 2, whimsy: 3, rarity: "C" },
    { name: "Green Slime", combat: 8, utility: 2, whimsy: 5, rarity: "C" },
    { name: "Wolfenite", combat: 11, utility: 17, whimsy: 11, rarity: "U" },
    { name: "Vinyl Record", combat: 15, utility: 15, whimsy: 15, rarity: "U" },
    { name: "Munchanka Root", combat: 17, utility: 11, whimsy: 11, rarity: "U" }
    // ... สามารถเพิ่มรายการอื่นๆ จากไฟล์ CSV ได้ที่นี่
];

// Database of Potions Logic (จากไฟล์ Potions List.csv)
// Logic: type + value (Highest Attribute) -> Potion Result
const POTIONS_DB = {
    "Combat": {
        1: { name: "Rabbit's Speed", rarity: "common", desc: "Within seconds of downing this potion, you feel a distinct lightness and spring in your step. For the next 10 minutes, your walking speed increases by 5 feet." },
        2: { name: "Weapon Master's Elixir", rarity: "common", desc: "When you drink this potion, you gain a sense of clarity and focus, and the swing of a certain weapon becomes second nature to you. For the next 24 hours, you gain proficiency with a melee weapon of your choice." },
        3: { name: "Spirit of Salyri", rarity: "common", desc: "This potion is said to contain the spirit of Salyri, a great Obojiman warrior known for her fighting prowess. Anyone who drinks this potion gains a certain understanding of how to effectively wear armor in combat. For the next 24 hours, you gain proficiency with one type of armor of your choice." },
        4: { name: "Beast Hide", rarity: "common", desc: "Drinking this potion thickens your skin and grows patches of fur all around your body. Frost that would normally freeze your skin instead melts on contact. For 1 minute, you have resistance to cold damage." },
        5: { name: "Spirit Armor", rarity: "common", desc: "When poured on a creature that isn't wearing armor, this potion covers the target with a magical force. For the next hour, the target has an AC of 15 while it isn't wearing armor. This effect ends if the target dons armor." },
        6: { name: "Displacement Field", rarity: "common", desc: "Drinking this silvery, glittering potion causes you to shimmer and flicker, making you appear to be standing next to your actual location. Until the start of your next turn, all attacks against you are made with disadvantage." },
        7: { name: "Shepherd's Bane", rarity: "common", desc: "It is said that this potion was first brewed in the Gale Fields by a young shepherd looking to protect their flock. The irony was not lost on them when they drank the potion and took on wolflike features. When you drink this potion, you grow claws which last for 1 hour. For the duration, your unarmed strikes using your claws deal slashing damage equal to 1d6 plus your Strength modifier, instead of the bludgeoning damage normal for an unarmed strike." },
        8: { name: "Bottled Bomb", rarity: "common", desc: "When thrown at a point that you can see within 60 feet of you, this volatile liquid explodes. Each creature within 5 feet of the explosion must make a DC 14 Dexterity saving throw, taking 1d8 force damage on a failed save, or half as much damage on a successful one." },
        9: { name: "Wonder Juice", rarity: "common", desc: "When you drink this multicolored potion, you instantly feel magical. For 1 minute, everything you are wearing or carrying is considered magical, allowing weapons you wield to overcome resistance and immunity to nonmagical attacks and damage." },
        10: { name: "Candlecap", rarity: "common", desc: "(เมื่อผลของ Potion หมดเวลา ผู้เล่นสามารถเลือกที่จะคงผลของตัวไฟเอาไว้ได้แต่จะไม่สามารถใช้โจมตีหรือ Dispell ผลได้จนกว่าจะจบเซสชั่น) After imbibing this potion, you gain lively flaming locks, which last for 1 hour and shed bright light in a 20-foot radius and dim light for an additional 20 feet. Once on each of your turns for the duration, you can cause an unarmed strike made with your head to deal an extra 1d4 fire damage. Additionally, you can take an action to cause the flame on your head to flare up and burst outward, dealing 2d4 fire damage to all other creatures within 5 feet of you; using this ability causes the effects of this potion to end early." },
        11: { name: "Eagle's Vision", rarity: "common", desc: "When you drink this potion, your eyes grow slightly larger and turn the golden color of an eagle. For the next minute, attacking at long range doesn't impose disadvantage on your ranged weapon attack rolls." },
        12: { name: "Paranoia", rarity: "common", desc: "When you drink this potion, you gain heightened senses along with the sneaking suspicion that you are being stalked. For the next 8 hours, you can't be surprised." },
        13: { name: "Bottled Torch", rarity: "common", desc: "When uncorked, this potion spews a hot yellow flame from its bottle for 1 minute, which resembles the shape of a blade. For the duration, you can make a melee weapon attack with the fiery blade as if it were an improvised weapon. On a hit, the target takes 2d4 fire damage. The blade disappears early if it is submerged in water." },
        14: { name: "Static Shock", rarity: "common", desc: "This potion makes you feel tingly as it charges you up with static electricity. Immediately after a creature touches you or hits you with a melee attack made with a metal weapon in the next 24 hours, you can use your reaction to send a charge of static electricity back at that creature, dealing 1d10 lightning damage to it. Once you do so, the effects of this potion end." },
        15: { name: "Incoming!", rarity: "common", desc: "Upon drinking this potion, you become hyper-aware of threats from afar and your reflexes snap into action, empowering you to slip out of harm's way or knock missiles aside. For 1 minute, you gain a +2 bonus to AC against ranged attacks." },
        16: { name: "Lightning Breath", rarity: "common", desc: "For 24 hours after drinking this shimmering gold liquid, your voice gains a crackling quality to it and your breath sparks and sputters. For the duration, you can use a bonus action to exhale an arc of lightning at a creature you can see within 30 feet of you. The target must make a DC 12 Dexterity saving throw, taking 1d10 lightning damage on a failed save, or half as much damage on a successful one. Once you exhale this lightning, the effects of this potion end." },
        17: { name: "Heroism", rarity: "common", desc: "When you drink this glowing red elixir, you gain advantage on the next attack roll you make within the next 24 hours." },
        18: { name: "Slugskin", rarity: "common", desc: "Drinking this potion makes your skin thick, slippery, and rubbery. Spears and sharp objects that would normally pierce your skin have a hard time getting through this tough texture. For the next minute, you have resistance to piercing damage. While the potion is active, you can choose to exude a slime trail as part of your movement." },
        19: { name: "Thunderbelch", rarity: "common", desc: "Upon ingesting this fiercely fizzing potion, roll a d4 to determine the number of rounds before you let forth a thunderous belch of epic proportions. On your turn that round, you must use your action to release the belch. Each creature other than you within 10 feet of you must make a DC 14 Constitution saving throw. On a failed save, a creature takes 3d8 thunder damage and is deafened until the end of your next turn. On a successful save, the creature takes half as much damage and isn't deafened." },
        20: { name: "Seeking Smoke", rarity: "common", desc: "When thrown at a creature that you can see within 30 feet of you, this shimmering liquid explodes, releasing a billowing cloud of smoke. The targeted creature must succeed on a DC 12 Dexterity saving throw, or be coated in a cloak of smoke for 1 minute. A creature coated in smoke has disadvantage on Dexterity (Stealth) checks made to hide." },
        21: { name: "Dancing Juice", rarity: "common", desc: "You can coat one melee weapon with this potion. When you hit a creature with the coated weapon in the next hour, you can force it to make a DC 12 Constitution saving throw. On a failed save, the weapon is no longer coated in the potion, and the target begins to convulse in a manner that could be mistaken for an awkward, clumsy series of dance steps. The target's speed is reduced to 0 until the end of its next turn, after which the convulsing ends." },
        22: { name: "Prickleskin", rarity: "common", desc: "Drinking this potion causes spines to emerge all over your body. These spines lay flat but can be controlled by you to stand on end. When you successfully grapple a creature and as a bonus action while it remains grappled, you can deal 1d4 piercing damage to the target. The effects of this potion last for 1 minute." },
        23: { name: "Tiny Bubbles", rarity: "common", desc: "Drinking this pink, bitter-tasting potion, causes hundreds of small, iridescent bubbles to emerge from your nose and mouth and fill a 20-foot cube that you can see within 30 feet of you. If the bubbles are left untouched, they float in place, remaining there for 1 hour. When a creature enters a space occupied by the bubbles for the first time on a turn, it must make a DC 13 Dexterity saving throw. On a failed save, a cacophony of popping erupts as the bubbles burst, dealing 1d6 thunder damage to all creatures inside the cube. The sound of the bubbles popping can be heard from a mile away." },
        24: { name: "Claws of the Crab King", rarity: "common", desc: "Your hands turn into a handsome set of powerful crab claws. For 1 minute, your unarmed strikes using the claws deal double damage to objects and structures, and you make grapple checks using them with advantage. The claws can't wield weapons or shields or do anything that requires manual precision, such as using tools or magic items or performing the somatic components of a spell." },
        25: { name: "Rubberskin", rarity: "common", desc: "When you drink this blue goo, your skin turns into a thick gray rubber. For 1 hour, you have resistance to lightning damage." },
        26: { name: "Keening Voice", rarity: "common", desc: "When you open this potion, a keening wail comes out of the bottle. When imbibed, this potion gives the drinker's vocal cords a magic resonance. As a bonus action, you can make a ranged attack against a creature within 60 feet of you, using your Charisma (Performance) bonus for the attack bonus. The target is unaffected if it can't hear you. On a hit, the target takes 1d6 thunder damage. The effect of this potion lasts for 1 hour." },
        27: { name: "Kinetic Pop", rarity: "common", desc: "When poured over a nonmagical weapon, this potion fills the mundane item with kinetic energy, causing it to vibrate with anticipation. The next time you hit a creature with the weapon, the energy explodes, doubling the damage rolled by the weapon's damage dice. The effects of this potion end after 1 hour or once the energy explodes." },
        28: { name: "Healing Gas", rarity: "common", desc: "When thrown at a point that you can see within 60 feet of you, this volatile liquid explodes, releasing a crimson ball of gas. Each creature within 5 feet of the explosion regains a number of hit points equal to 1d4 + 1." },
        29: { name: "Cinderskin", rarity: "common", desc: "When you drink this bubbling, black potion, your skin becomes encrusted with charcoal. For 1 hour, you have resistance to fire damage." },
        30: { name: "Iron Mind", rarity: "common", desc: "After imbibing this elixir, your eyes glow with a silvery-blue hue. For 1 hour, you gain advantage on saving throws against being charmed and resistance to psychic damage." },
        31: { name: "Gargoyle Hooch", rarity: "uncommon", desc: "This gray liquid tastes like mud and makes your tongue numb. Within seconds of swallowing the potion, your skin turns to living stone. For the next hour, you gain a +2 bonus to AC, and your walking speed is reduced by 5 feet." },
        32: { name: "Elixir of Jipampa", rarity: "uncommon", desc: "When you drink this potion, you can feel your nervous system gain a boost of furtive energy from the rabbit spirit, Jipampa. Your pupils dilate and your reflexes become enhanced. For the next 24 hours, you gain a +5 bonus to initiative rolls. Additionally, if a trigger would allow you to take a reaction, but you have already used your reaction this round, you can choose to take a second reaction; using this ability causes the effects of this potion to end early." },
        33: { name: "Catspeed", rarity: "uncommon", desc: "When you drink this potion, you are overwhelmed by a warm lethargic feeling that rests like a blanket over an intense burst of energy you feel swirling inside of you. Once within the next 24 hours when you take the Attack action, you can make two additional attacks as part of that action. Once you do so, the effects of this potion end. While the potion is active, you gain the ability to purr like a cat." },
        34: { name: "Durability", rarity: "uncommon", desc: "When you drink this potion, your skin becomes as tough as thick leather that, for a short time, repairs itself. For 1 minute, you gain 10 temporary hit points at the start of each of your turns." },
        35: { name: "Fire Shield", rarity: "uncommon", desc: "This potion burns like a hot tamale when you drink it and fills you with fiery strength. The next time you would take fire damage, you take no damage and instead regain a number of hit points equal to half the damage you would have taken. The effects of this potion last for 24 hours or until you regain hit points in this way." },
        36: { name: "Tunnel Vision", rarity: "uncommon", desc: "Drinking this potion causes you to hyperfixate on your strikes but potentially opens you to counterattacks. The effects of this potion last for 1 minute. For the duration, the first time you hit a target with a weapon attack on each of your turns, it deals an extra 1d12 damage of the same type. Until the potion's effects end, you also take a -2 penalty to AC." },
        37: { name: "Ratatam's Glowskin Elixir", rarity: "uncommon", desc: "When you drink this potion, your skin begins to shed dim light in a 10-foot radius around you. As a bonus action, you can choose to intensify this light—shedding bright light in a 10-foot radius, and dim light for an additional 10 feet—or diminish the intensity again. Additionally, you can take an action to produce a flare of blinding light around you. Each creature within 30 feet of you that can see must succeed on a DC 16 Constitution saving throw or become blinded for 1 minute. An affected creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. The effects of this potion last for 8 hours or until you use the flare." },
        38: { name: "Don't Hit Me Juice", rarity: "uncommon", desc: "When thrown at a creature you can see within 30 feet of you, this bright pink elixir breaks, covering the creature in juice. The target must succeed on a DC 16 Wisdom saving throw or be pacified for 1 minute. A pacified creature can't attack, cast a spell that affects an enemy, or deal damage to another creature. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success." },
        39: { name: "Invulnerability", rarity: "uncommon", desc: "When you open this potion, it bursts forth with a symphonic fanfare. Until the start of your next turn, you are immune to all damage. On your next turn, you can't move or take actions, as a wave of lethargy sweeps over you." },
        40: { name: "Bottled Bind", rarity: "uncommon", desc: "When thrown at a creature you can see within 30 feet of you, this thick mudlike potion breaks, covering the creature in tacky glue. The target must succeed on a DC 15 Strength saving throw or become restrained for 1 minute. The restrained target can use its action to make a DC 15 Strength check. On a success, the target is no longer restrained." },
        41: { name: "Respiratory Distress", rarity: "uncommon", desc: "This potion reacts instantly with air, rapidly expanding into a 15-foot-radius cloud of irritating gas when exposed. You can throw it at a point you can see within 60 feet of you, causing it to break open and release the cloud there. Each creature within the cloud when it appears must make a DC 15 Constitution saving throw. On a failed save, a creature spends its reaction coughing and snorting and its concentration is broken if it was concentrating." },
        42: { name: "Pumpkin Patch Guard", rarity: "uncommon", desc: "When consumed, this warming harvest beverage transforms your head into a Jack-O'-Lantern. From your newly formed eyes, you cast a cone of glowing light, which causes creatures in a 15-foot cone to be under the effects of the Faerie Fire spell. At the start of each of your turns while the effects last, you decide which way the cone faces and whether the cone is active. The effect of the potion lasts for 1 minute." },
        43: { name: "Sheep Dragon Brew", rarity: "uncommon", desc: "One swig of this hearty potion will see you growing a thick coat of sheep dragon wool all around your body. Besides keeping you warm, it aids your survival and protects you from the cold. For the duration, your AC increases by 1, and you gain resistance to cold damage. The effects of the potion last for 1 hour." },
        44: { name: "Enhanced Static Shock", rarity: "uncommon", desc: "This potion makes you feel tingly as it charges you up with static electricity. Immediately after a creature touches you or hits you with a melee attack made with a metal weapon in the next 24 hours, you can use your reaction to send a charge of static electricity back at that creature, dealing 3d10 lightning damage to it. Once you do so, the effects of this potion end." },
        45: { name: "Enhanced Lightning Breath", rarity: "uncommon", desc: "For 24 hours after drinking this shimmering gold liquid, your voice gains a crackling quality to it and your breath sparks and sputters. For the duration, you can use a bonus action to exhale an arc of lightning at a creature you can see within 30 feet of you. The target must make a DC 16 Dexterity saving throw, taking 3d10 lightning damage on a failed save, or half as much damage on a successful one. Once you exhale this lightning, the effects of this potion end." },
        46: { name: "Enhanced Bottled Bomb", rarity: "uncommon", desc: "When thrown at a point that you can see within 60 feet of you, this volatile liquid explodes. Each creature within 5 feet of the explosion must make a DC 16 Dexterity saving throw, taking 3d8 force damage on a failed save, or half as much damage on a successful one." },
        47: { name: "Wrathful Spirit", rarity: "uncommon", desc: "When consumed, you feel the essence of a long-dead spirit overwhelm you. You feel on edge and have an undertone of rage that boils below the surface. Roll 2d8. For the duration, whenever you cast a spell, you can cause one target that took damage from it to take extra force damage equal to the number rolled. The effects of this potion last for 1 minute." },
        48: { name: "Rapid Withdrawal", rarity: "uncommon", desc: "When you drink this potion, motes of pink light erupt from your body and orbit around you. For 1 minute, whenever you take damage from a hostile creature, you can use your reaction to teleport up to 15 feet to an unoccupied space you can see." },
        49: { name: "Life-Steal", rarity: "uncommon", desc: "This dangerous and disliked potion transforms when used. As an action, you can uncork the potion and point it toward a creature within 10 feet of you. The target takes 3d6 necrotic damage, and the potion transforms into a healing elixir. A creature that consumes this elixir regains a number of hit points equal to the necrotic damage dealt." },
        59: { name: "Dragon's Breath", rarity: "rare", desc: "Exhale energy breath weapon." }, 
        60: { name: "Invulnerability", rarity: "rare", desc: "Resistance to all damage for 1 minute." }
    },
    "Utility": {
        1: { name: "Night Eye", rarity: "common", desc: "Darkvision 60ft for 1 hour." },
        // ... (ใส่ข้อมูลเพิ่ม)
        60: { name: "Wish in a Bottle", rarity: "rare", desc: "Cast Wish spell once." }
    },
    "Whimsical": {
        1: { name: "Giggle Juice", rarity: "common", desc: "Uncontrollable laughter." },
        // ... (ใส่ข้อมูลเพิ่ม)
        59: { name: "Chicken Chaser", rarity: "rare", desc: "Summon 100 chickens." },
        60: { name: "Disappearing Act", rarity: "rare", desc: "Vanish completely." }
    }
};

// Helper function to find potion
function findPotion(type, value) {
    const category = POTIONS_DB[type];
    if (!category) return null;

    // หาค่า Potion ที่ใกล้เคียงที่สุดแต่ไม่เกินค่า Value ที่ทำได้ (Fallback logic)
    // หรือถ้าตามกฎคือ "ต้องตรงเป๊ะ" ถ้าไม่ตรงจะได้ Sludge ให้แก้ logic ตรงนี้
    
    // Logic: หาค่า index ที่ตรงกับ value
    if (category[value]) {
        return category[value];
    }
    
    // กรณีไม่เจอค่าตรงเป๊ะ ให้หาค่าที่น้อยกว่าที่ใกล้ที่สุด (หรือจะให้ Fail ก็ได้)
    // ในที่นี้สมมติว่าถ้าค่าเกินให้ปัดลงมาหาอันสูงสุดที่มี
    let keys = Object.keys(category).map(Number).sort((a,b) => b-a);
    for (let k of keys) {
        if (value >= k) return category[k];
    }

    return { name: "Failed Sludge", rarity: "common", desc: "การปรุงยาผิดพลาด ได้เพียงโคลนเละๆ" };
}