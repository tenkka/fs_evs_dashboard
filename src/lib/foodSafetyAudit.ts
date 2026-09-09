// Transcribed from "Food Safety Audit July 26.pdf" — completed checklist, 7/7/2026.

export type AuditItem = {
  text: string;
  answer: "Yes" | "No";
  compliant: boolean;
  note?: string;
};

export type AuditSection = {
  name: string;
  items: AuditItem[];
};

export const auditMeta = {
  date: "2026-07-07",
  auditor: "M. Morris",
};

const yes = (text: string): AuditItem => ({ text, answer: "Yes", compliant: true });
const noGood = (text: string): AuditItem => ({ text, answer: "No", compliant: true });

export const foodSafetySections: AuditSection[] = [
  {
    name: "Receipt of Food/Product Items",
    items: [
      yes("Is the staff aware of food safety issues accepting receipt of incoming food items?"),
      yes("When questioned, is staff aware of the main food safety factors when inspecting food before accepting delivery?"),
      yes("Does the invoice match items received?"),
      yes("Are refrigerated and frozen product items temperatures monitored during receipt (except for whole fruit and vegetables)?"),
      yes("Are items stored properly and in a timely manner upon receipt?"),
    ],
  },
  {
    name: "Storage",
    items: [
      noGood("Are potentially hazardous foods, such as beef, chicken, pork, etc. thawing at room temperature?"),
      noGood("Are there food items in the refrigerator(s) that are unlabeled or undated?"),
      yes("Are potentially hazardous foods like uncooked meat, poultry, fish and eggs stored appropriately?"),
      yes("Are all storage areas organized and clean with food products stored 6 inches off of the ground?"),
      yes("Are all foods in storage containers covered and labeled with name of product, date of receipt and date to use by/discard by."),
      yes("Are foods stored in a rotation FIFO?"),
      yes("Are recalled foods stored in a dedicated area, if applicable?"),
      yes("Are temperatures of the storage areas operating in the correct temperature range?"),
      yes("Are foods stored to prevent cross contamination from raw to cooked foods in storage areas?"),
      noGood("Are food stored in direct contact with soiled surfaces or rust?"),
      yes("Is the structure of the storage area in good condition with no cracks in the walls, impervious floors and no condensation in the refrigerator?"),
      yes("Is the equipment in good condition (i.e., door seals, etc.)?"),
      yes("Are refrigerator temperatures at or below 41°F (checked between meal service activities)?"),
      yes("Are freezer temperatures maintained at a level to keep frozen food solid?"),
      noGood("Are there internal temperatures of potentially hazardous, refrigerated foods that are not within acceptable ranges of 41°F or lower?"),
      yes("Are dented canned goods stored separately?"),
      yes("Are scoops stored outside of bulk food?"),
      noGood("Are there signs of water damage from sewage lines and/or pipelines?"),
      noGood("Signs of negative outcome (e.g., freezer burn, foods dried out, foods with a change in color)?"),
      yes("Are storage areas free from pests?"),
      yes("Are chemicals and cleaning products stored away from food storage areas?"),
    ],
  },
  {
    name: "Cleaning",
    items: [
      yes("The cleaning schedule is being followed."),
      yes("Are sanitizers for work surfaces readily available during food preparation and checked for PPM levels?"),
      yes("Are SDS readily available?"),
      yes("Are all cleaning chemicals stored separately from food areas?"),
      yes("Are all cleaning chemicals clearly labeled?"),
      yes("Is the dishwashing machine operating correctly and maintained in good order?"),
    ],
  },
  {
    name: "Maintenance of Premises and Equipment",
    items: [
      yes("Is all equipment in good repair and clean?"),
      yes("Is there sufficient and well maintained lighting, ventilation and drainage?"),
      yes("Unused or broken equipment is removed from the department."),
      yes("Refrigerators and freezers are clean and in safe operating conditions."),
      yes("Fans in food prep area are clean."),
      yes("Utensils/equipment are cleaned and maintained to prevent food borne illnesses."),
      yes("Food trays, dinnerware and utensils are clean and in food condition (i.e., not cracked or chipped)."),
      yes("All large equipment is fitted with thermometers or other temperature measuring devices."),
      yes("All probe thermometers have been calibrated and any without a 33.8°F tolerance are discarded."),
      {
        text: "Is the premises in good repair with clean drains, no peeling paint, no holes or gaps where pests might enter, etc.?",
        answer: "No",
        compliant: false,
        note: "Peeling paint — work order submitted 7/8/25",
      },
    ],
  },
  {
    name: "Pest Control",
    items: [
      yes("There is no evidence of rodent or pest activity."),
      yes("Records of pest control visits and treatments administered are kept."),
      yes("There is a pest control contract on-site."),
      yes("External openings are adequately sealed to prevent entry of pests."),
    ],
  },
  {
    name: "Waste",
    items: [
      yes("Waste is removed when bins are ¾ full."),
      yes("Waste containers are covered, kept clean and emptied after each work period."),
    ],
  },
  {
    name: "Personal Hygiene",
    items: [
      yes("Daily hygiene practices are monitored and corrected."),
      yes("There is sufficient hand-washing facilities installed in the food handling areas."),
      yes("Hand-washing facilities include warm water, soap and paper towels."),
      yes("Food handlers wash their hands as often as necessary."),
      yes("Food handlers use gloves appropriately and correctly."),
      yes("All jewelry including watches are removed prior to commencing food handling."),
      yes("There is no evidence of eating or smoking in the food handling area."),
      yes("Food Service personnel wear appropriate protective clothing and head coverings."),
      yes("All staff understand their responsibilities to report illness."),
      yes("There is a first-aid box available. Wounds are covered with water proof dressings."),
      yes("Are staff aware of food safety practices and their responsibilities (e.g., do not touch hair, face or nose then touch food)?"),
      yes("Are staff aware that they cannot work when they may be suffering from a food borne illness or condition?"),
      yes("Are staff trained in food safety and have food handlers card?"),
    ],
  },
  {
    name: "Training",
    items: [
      yes("All staff training is up-to-date. In-services are being conducted monthly and documented."),
      yes("All new hires have been provided department orientation and training including reporting of illness, correct hand washing, correct use of gloves and personal hygiene standards."),
    ],
  },
  {
    name: "Product Recall",
    items: [yes("All recalled products are returned to the supplier and/or discarded immediately.")],
  },
  {
    name: "Food Preparation",
    items: [
      yes("Are hot foods held at 135°F or higher?"),
      yes("Are cold foods held at 41°F or lower?"),
      yes("Are food surfaces thoroughly cleaned after preparation of meat, fish or fowl?"),
      yes("If soft cooked or undercooked eggs are used, are pasteurized or unpasteurized shell/liquid eggs being used properly?"),
      yes("Are internal temperatures being monitored for 15 seconds to the required cooking temperatures?"),
      yes("Food items are reheated to proper temperatures (165°F for at least 15 seconds)."),
      yes("Ready-to-eat foods requiring heating are taken directly from a sealed container or approved facility and heated to 135°F."),
      yes("Nourishments and snacks held at room temperature are served within 4 hours of delivery."),
      yes("Is the preparation schedule set so allergen-free foods are prepared before foods containing allergens?"),
      yes("Are salads and other raw vegetables/fruits washed prior to serving?"),
      yes("Are the correct equipment/utensils used to prevent cross-contamination?"),
      yes("Are work surfaces, utensils and equipment clean?"),
      yes("Are staff following good hand hygiene practices?"),
      yes("Are staff who are ill kept away from direct contact with food?"),
      yes("Are there adequate hand washing and drying facilities for staff?"),
      yes("When questioned, are staff knowledgeable in personal hygiene practices?"),
      yes("Staff who serve food or are collecting soiled plates and food waste use proper hand washing."),
      yes("Are staff belongings stored appropriately and not at risk for contaminating food or equipment during preparation?"),
      yes("Are chemicals stored separately/away from food?"),
    ],
  },
  {
    name: "Thawing",
    items: [
      yes("Are food products thawed under refrigeration or running water?"),
      yes("Are products being thawed covered, and/or wrapped and labeled?"),
      yes("Are thawed products used within 3 days of removal from the freezer?"),
    ],
  },
  {
    name: "Cooling",
    items: [
      yes("Are the records of temperature monitoring for all refrigerated storage areas used?"),
      yes("Are cooked foods cooled to 70°F within 2 hours and 41°F within an additional 4 hours?"),
      yes("All leftovers are cooled quickly and promptly in shallow pans in the refrigerator or freezer."),
      yes("Are food containers dated and labeled with the product name, date prepared and discard date prior to cold storage?"),
    ],
  },
  {
    name: "Dinnerware Sanitization and Storage",
    items: [
      yes("Dishwasher temperatures are at 150°F, 180°F rinse OR 120°F wash + 50 ppm hypochlorite."),
      yes("When done manually, dishes are sanitized by immersion in hot water (171°F+) for 30 seconds or a chemical sanitizing solution."),
      yes("Dishes, food preparation equipment and utensils are not towel dried."),
      yes("Dishware is stored to prevent contamination (clean, dry location, covered or inverted)."),
      yes("Sanitation logs and dish machine logs are completed."),
    ],
  },
  {
    name: "Transportation",
    items: [
      yes("All foods are stored in suitable containers to maintain temperature control during transit."),
      yes("The temperature of food items are checked prior to serving."),
      yes("All food items are covered to prevent contamination."),
    ],
  },
  {
    name: "Customer/Internal Complaints",
    items: [
      yes("Is there a system in place to handle customer/patient complaints?"),
      yes("Are there clear lines of reporting and responsibility?"),
      yes("When questioned are staff aware of what to do if they receive a customer complaint?"),
    ],
  },
  {
    name: "Food Safety Program",
    items: [
      yes("The Safety Audit was conducted no more than a month ago."),
      yes("Quarterly Audits are being conducted on a regular basis."),
    ],
  },
  {
    name: "Unit Refrigerators",
    items: [
      yes("Are snack/nourishment refrigerators on units maintained so to prevent potential food borne illnesses?"),
      yes("Are proper refrigerator temperatures maintained and are foods labeled and dated?"),
    ],
  },
];

export function sectionCompliance(section: AuditSection) {
  const total = section.items.length;
  const compliant = section.items.filter((i) => i.compliant).length;
  return { total, compliant, pct: Math.round((compliant / total) * 1000) / 10 };
}

export function auditTotals() {
  const total = foodSafetySections.reduce((sum, s) => sum + s.items.length, 0);
  const compliant = foodSafetySections.reduce((sum, s) => sum + s.items.filter((i) => i.compliant).length, 0);
  const pct = Math.round((compliant / total) * 100);
  return { total, compliant, nonCompliant: total - compliant, pct };
}

export function openFindings() {
  const findings: { section: string; item: AuditItem }[] = [];
  for (const section of foodSafetySections) {
    for (const item of section.items) {
      if (!item.compliant) findings.push({ section: section.name, item });
    }
  }
  return findings;
}
