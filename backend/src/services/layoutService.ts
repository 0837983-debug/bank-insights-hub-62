import { prisma } from "../config/database.js";

/**
 * Builds layout JSON structure from database
 */
export async function buildLayoutFromDB(requestedLayoutId?: string) {
  try {
    // Resolve target layout
    let layoutId = requestedLayoutId;
    if (!layoutId) {
      const defaultLayout = await prisma.configLayout.findFirst({
        where: {
          isDefault: true,
          isActive: true,
          deletedAt: null,
        },
        orderBy: [
          { displayOrder: "asc" },
          { updatedAt: "desc" },
          { id: "asc" },
        ],
      });
      if (defaultLayout) {
        layoutId = defaultLayout.id;
      }
    }
    if (!layoutId) {
      // If no layout configured yet, return minimal structure
      return { formats: {}, sections: [] };
    }

    // 1) First, collect all format IDs that are used in active components of this layout
    const usedFormatIds = await prisma.configComponentField.findMany({
      where: {
        component: {
          componentMappings: {
            some: {
              layoutId: layoutId,
              deletedAt: null,
            },
          },
        },
        deletedAt: null,
        isActive: true,
        formatId: {
          not: null,
        },
      },
      select: {
        formatId: true,
      },
      distinct: ["formatId"],
    });

    const formatIds = usedFormatIds
      .map((f: { formatId: string | null }) => f.formatId)
      .filter((id: string | null): id is string => id !== null);

    console.log('[layoutService] Layout ID:', layoutId);
    console.log('[layoutService] Used format IDs from components:', formatIds);

    // 2) Load only the formats that are actually used
    const formatsData = await prisma.configFormat.findMany({
      where: {
        id: {
          in: formatIds,
        },
        deletedAt: null,
        isActive: true,
        componentFields: {
          some: {
            component: {
              componentMappings: {
                some: {
                  layoutId: layoutId,
                  deletedAt: null,
                },
              },
            },
            deletedAt: null,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        kind: true,
        pattern: true,
        currency: true,
        prefixUnitSymbol: true,
        suffixUnitSymbol: true,
        minimumFractionDigits: true,
        maximumFractionDigits: true,
        thousandSeparator: true,
        multiplier: true,
        shorten: true,
        colorRules: true,
        symbolRules: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    console.log('[layoutService] Query returned', formatsData.length, 'formats:', formatsData.map((f: { id: string }) => f.id));

    // Explicitly filter to only include currency_rub and percent
    // This is a safety measure in case the query doesn't work as expected
    const allowedFormatIds = ['currency_rub', 'percent'];
    const filteredFormats = formatsData.filter((f: { id: string }) => allowedFormatIds.includes(f.id));

    if (filteredFormats.length !== formatsData.length) {
      console.warn('[layoutService] WARNING: Query returned unexpected formats!');
      console.warn('[layoutService] Filtered from', formatsData.length, 'to', filteredFormats.length, 'formats');
      console.warn('[layoutService] Allowed formats:', allowedFormatIds);
      console.warn('[layoutService] Received formats:', formatsData.map((f: { id: string }) => f.id));
    }

    const formats: any = {};
    console.log('[layoutService] Building formats object from', filteredFormats.length, 'filtered rows');
    for (const format of filteredFormats) {
      console.log('[layoutService] Adding format:', format.id);
      formats[format.id] = {
        kind: format.kind,
        ...(format.pattern && { pattern: format.pattern }),
        ...(format.currency && { currency: format.currency }),
        ...(format.prefixUnitSymbol && { prefixUnitSymbol: format.prefixUnitSymbol }),
        ...(format.suffixUnitSymbol && { suffixUnitSymbol: format.suffixUnitSymbol }),
        ...(format.minimumFractionDigits !== null && { minimumFractionDigits: format.minimumFractionDigits }),
        ...(format.maximumFractionDigits !== null && { maximumFractionDigits: format.maximumFractionDigits }),
        ...(format.thousandSeparator !== null && { thousandSeparator: format.thousandSeparator }),
        ...(format.multiplier !== null && { multiplier: Number(format.multiplier) }),
        ...(format.shorten !== null && { shorten: format.shorten }),
        ...(format.colorRules && { colorRules: format.colorRules }),
        ...(format.symbolRules && { symbolRules: format.symbolRules }),
      };
    }

    // 2) Sections (containers at top level)
    const sectionsData = await prisma.configLayoutComponentMapping.findMany({
      where: {
        layoutId: layoutId,
        parentInstanceId: null,
        deletedAt: null,
        component: {
          componentType: 'container',
        },
      },
      include: {
        component: true,
      },
      orderBy: [
        { displayOrder: "asc" },
        { id: "asc" },
      ],
    });

    const sections: any[] = [];
    for (const sectionMapping of sectionsData) {
      const sectionInstanceId = sectionMapping.instanceId;
      const sectionTitle = sectionMapping.titleOverride || sectionMapping.component.title || sectionInstanceId;

      // 3) Child components for each section
      const childComponents = await prisma.configLayoutComponentMapping.findMany({
        where: {
          layoutId: layoutId,
          parentInstanceId: sectionInstanceId,
          deletedAt: null,
        },
        include: {
          component: true,
        },
        orderBy: [
          { displayOrder: "asc" },
          { id: "asc" },
        ],
      });

      const components: any[] = [];
      for (const mapping of childComponents) {
        const type = mapping.component.componentType;
        if (type === "card") {
          // Fetch fields for the card component with parent_field_id structure
          const cardFields = await prisma.configComponentField.findMany({
            where: {
              componentId: mapping.componentId,
              deletedAt: null,
              isActive: true,
            },
            orderBy: [
              { displayOrder: "asc" },
              { id: "asc" },
            ],
          });

          // Build format object from fields with parent_field_id hierarchy
          const format: any = {};
          const mainField = cardFields.find((f: { parentFieldId: string | null }) => !f.parentFieldId);
          const childFields = cardFields.filter((f: { parentFieldId: string | null }) => f.parentFieldId);

          if (mainField && mainField.formatId) {
            format.value = mainField.formatId;
          }

          // Map child fields to format keys based on field_id
          for (const childField of childFields) {
            if (childField.formatId) {
              if (childField.fieldId === "change_pptd" || childField.fieldId === "PPTD") {
                format.PPTD = childField.formatId;
              } else if (childField.fieldId === "change_ytd" || childField.fieldId === "YTD") {
                format.YTD = childField.formatId;
              }
            }
          }

          const card: any = {
            id: mapping.instanceId,
            type: "card",
            title: mapping.titleOverride ?? mapping.component.title ?? mapping.instanceId,
            ...(mapping.tooltipOverride ?? mapping.component.tooltip ? { tooltip: mapping.tooltipOverride ?? mapping.component.tooltip } : {}),
            ...(mapping.iconOverride ?? mapping.component.icon ? { icon: mapping.iconOverride ?? mapping.component.icon } : {}),
            dataSourceKey: mapping.dataSourceKeyOverride ?? mapping.component.dataSourceKey,
            ...(Object.keys(format).length > 0 ? { format } : {}),
          };
          components.push(card);
        } else if (type === "table") {
          // Fetch fields for the referenced component
          const fields = await prisma.configComponentField.findMany({
            where: {
              componentId: mapping.componentId,
              deletedAt: null,
              isActive: true,
            },
            orderBy: [
              { displayOrder: "asc" },
              { id: "asc" },
            ],
          });

          // Separate main fields (no parent) and child fields (with parent)
          const mainFields = fields.filter((f: { parentFieldId: string | null }) => !f.parentFieldId);
          const childFields = fields.filter((f: { parentFieldId: string | null }) => f.parentFieldId);

          // Build columns from main fields, including child fields in format
          const columns = mainFields
            .filter((f: { isVisible: boolean | null }) => f.isVisible !== false)
            .map((f: { fieldId: string; label: string | null; fieldType: string; formatId: string | null; parentFieldId: string | null }) => {
              const col: any = {
                id: f.fieldId,
                label: f.label ?? f.fieldId,
                type: f.fieldType,
              };

              // Build format object with main field and child fields
              const format: any = {};
              if (f.formatId) {
                format.value = f.formatId;
              }

              // Find child fields for this main field
              const children = childFields.filter((cf: { parentFieldId: string | null; fieldId: string; formatId: string | null }) => cf.parentFieldId === f.fieldId);
              for (const childField of children) {
                if (childField.formatId) {
                  if (childField.fieldId === "change_pptd" || childField.fieldId === "PPTD") {
                    format.PPTD = childField.formatId;
                  } else if (childField.fieldId === "change_ytd" || childField.fieldId === "YTD") {
                    format.YTD = childField.formatId;
                  }
                }
              }

              // Add format if it has any keys
              if (Object.keys(format).length > 0) {
                col.format = format;
              }

              return col;
            });
          const table: any = {
            id: mapping.instanceId,
            type: "table",
            title: mapping.titleOverride ?? mapping.component.title ?? mapping.instanceId,
            columns,
            dataSourceKey: mapping.dataSourceKeyOverride ?? mapping.component.dataSourceKey,
          };
          components.push(table);
        } else if (type === "chart") {
          const chart: any = {
            id: mapping.instanceId,
            type: "chart",
            title: mapping.titleOverride ?? mapping.component.title ?? mapping.instanceId,
            dataSourceKey: mapping.dataSourceKeyOverride ?? mapping.component.dataSourceKey,
          };
          components.push(chart);
        } else if (type === "filter") {
          // Filters will be projected into filters[] later if needed; skip adding as component
          continue;
        }
      }

      sections.push({
        id: sectionInstanceId,
        title: sectionTitle,
        components,
      });
    }

    return { formats, sections };
  } catch (error) {
    console.error('[layoutService] Error building layout:', error);
    throw error;
  }
}
