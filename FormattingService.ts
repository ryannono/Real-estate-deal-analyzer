interface FormattingConfig {
  locale?: string;
  currency?: string;
  currencySignDisplay?: keyof Intl.NumberFormatOptionsSignDisplayRegistry;
  percentageDigits?: number;
  numbersDigits?: number;
  suppressTrailingZeros?: boolean;
  sectionTitleLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  formatTitleCase?: boolean;
}

type FormatterType = 'currency' | 'percentage' | 'text' | 'number' | 'compact';

export interface ReportField {
  value: number | string;
  formatter?: FormatterType;
  note?: string;
  highlight?: boolean;
}

interface ReportSection {
  title: string;
  description?: string;
  data: Record<string, ReportField | number | string>;
  defaultFormatter?: FormatterType;
  collapsed?: boolean;
}

interface ReportData {
  title: string;
  description?: string;
  sections: ReportSection[];
}

class FormattingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormattingError';
  }
}

class FormattingService {
  private readonly formatters: Map<FormatterType, Intl.NumberFormat> =
    new Map();

  private readonly config: Required<FormattingConfig>;

  private readonly titleCaseMap: Map<string, string> = new Map();

  private readonly acronyms = new Set(['ROI', 'CoC', 'PMI', 'HOA', 'CapEx']);

  constructor(config: FormattingConfig = {}) {
    this.config = {
      locale: config.locale ?? 'en-CA',
      currency: config.currency ?? 'CAD',
      currencySignDisplay: config.currencySignDisplay ?? 'auto',
      percentageDigits: config.percentageDigits ?? 2,
      numbersDigits: config.numbersDigits ?? 2,
      suppressTrailingZeros: config.suppressTrailingZeros ?? true,
      sectionTitleLevel: config.sectionTitleLevel ?? 2,
      formatTitleCase: config.formatTitleCase ?? true,
    };

    this.initializeFormatters();
  }

  /**
   * Initializes and stores the number formatters for different types of data.
   *
   * @remarks
   * This method creates four number formatters:
   * - Currency: Formats numbers as currency values.
   * - Percentage: Formats numbers as percentages.
   * - Number: Formats numbers with a specified number of fractional digits.
   * - Compact: Formats numbers in a compact notation (e.g., 1.2M, 450K).
   *
   * If any error occurs during the initialization process, a `FormattingError` is thrown.
   *
   * @throws {FormattingError} - If an error occurs during the initialization process.
   */
  private initializeFormatters = (): void => {
    try {
      // Currency formatter
      this.formatters.set(
        'currency',
        new Intl.NumberFormat(this.config.locale, {
          style: 'currency',
          currency: this.config.currency,
          signDisplay: this.config.currencySignDisplay,
          minimumFractionDigits: this.config.suppressTrailingZeros ? 0 : 2,
        })
      );

      // Percentage formatter
      this.formatters.set(
        'percentage',
        new Intl.NumberFormat(this.config.locale, {
          style: 'percent',
          minimumFractionDigits: this.config.percentageDigits,
          maximumFractionDigits: this.config.percentageDigits,
        })
      );

      // Number formatter
      this.formatters.set(
        'number',
        new Intl.NumberFormat(this.config.locale, {
          minimumFractionDigits: this.config.numbersDigits,
          maximumFractionDigits: this.config.numbersDigits,
        })
      );

      // Compact number formatter (e.g., 1.2M, 450K)
      this.formatters.set(
        'compact',
        new Intl.NumberFormat(this.config.locale, {
          notation: 'compact',
          compactDisplay: 'short',
        })
      );
    } catch (error) {
      throw new FormattingError(
        `Failed to initialize formatters: ${(error as Error).message}`
      );
    }
  };

  /**
   * Formats a given string into title case, handling acronyms and optionally caching the result.
   *
   * @param str - The string to be formatted.
   * @returns The formatted string.
   *
   * @remarks
   * This function first checks if the input string is already cached. If it is, the cached result is returned.
   * If the `formatTitleCase` configuration option is set to `false`, the input string is returned as is.
   * Otherwise, the function applies the following transformations to the input string:
   * - Words are separated by a space.
   * - The first character of the string is capitalized.
   * - Acronyms are converted to uppercase.
   * - The formatted string is trimmed.
   * Finally, the formatted string is cached and returned.
   */
  private formatTitle = (str: string): string => {
    // Check cache first
    const cached = this.titleCaseMap.get(str);
    if (cached) return cached;

    if (!this.config.formatTitleCase) return str;

    const formatted = str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase())
      .replace(/\b\w+\b/g, (word) => {
        if (this.acronyms.has(word.toUpperCase())) {
          return word.toUpperCase();
        }
        return word;
      })
      .trim();

    // Cache the result
    this.titleCaseMap.set(str, formatted);
    return formatted;
  };

  /**
   * Formats a given value based on the specified formatter type.
   *
   * @param value - The value to be formatted. If the value is a string, it will be returned as is.
   * @param formatter - The type of formatter to use. If not provided, the 'text' formatter will be used.
   *
   * @returns The formatted value as a string. If the value is a number and a formatter is specified,
   * the number will be formatted according to the specified formatter. If no formatter is specified,
   * the number will be converted to a string.
   *
   * @throws {FormattingError} - If the specified formatter type is not recognized.
   */
  private formatValue = (
    value: number | string,
    formatter?: FormatterType
  ): string => {
    if (typeof value === 'string') return value;

    const numberFormatter = this.formatters.get(formatter ?? 'text');
    if (numberFormatter) {
      return numberFormatter.format(value);
    }

    return String(value);
  };

  /**
   * Generates a Markdown section for a report based on the provided data.
   *
   * @param title - The title of the section.
   * @param description - An optional description for the section.
   * @param data - The data to be included in the section.
   * @param defaultFormatter - The default formatter to use for values in the section.
   * @param collapsed - Indicates whether the section should be collapsed by default.
   *
   * @returns A Markdown string representing the section.
   *
   * @remarks
   * This function processes the provided data and generates a Markdown section with the specified title,
   * description, and data. It applies formatting to the values based on the provided formatter or the default
   * formatter. If the `collapsed` parameter is set to `true`, the section will be wrapped in a `<details>`
   * tag to allow collapsing the content.
   */
  private generateSection = ({
    title,
    description,
    data,
    defaultFormatter,
    collapsed,
  }: ReportSection): string => {
    const lines = Object.entries(data).map(([key, fieldData]) => {
      let value: number | string;
      let formatter = defaultFormatter;
      let note: string | undefined;
      let highlight: boolean | undefined;

      if (typeof fieldData === 'object' && 'value' in fieldData) {
        value = fieldData.value;
        formatter = fieldData.formatter ?? defaultFormatter;
        note = fieldData.note;
        highlight = fieldData.highlight;
      } else {
        value = fieldData;
      }

      let line = `${this.formatTitle(key)}: ${this.formatValue(
        value,
        formatter
      )}`;

      if (note) {
        line += ` _(${note})_`;
      }

      if (highlight) {
        line = `\n**${line}**`;
      }

      return `- ${line}`;
    });

    const titleHashes = '#'.repeat(this.config.sectionTitleLevel);
    const output = [`${titleHashes} ${title}:`, ''];

    if (description) {
      output.push(description, '');
    }

    if (collapsed) {
      output.push(
        '<details>',
        '<summary>Show details</summary>',
        '',
        ...lines,
        '',
        '</details>'
      );
    } else {
      output.push(...lines);
    }

    return output.join('\n');
  };

  /**
   * Generates a Markdown report based on the provided report data.
   *
   * @param reportData - The report data to be included in the Markdown report.
   * @returns A Markdown string representing the report.
   *
   * @throws {FormattingError} - If an error occurs during the report generation process.
   *
   * @remarks
   * This function processes the provided report data and generates a Markdown report with the specified title,
   * description, and sections. It applies formatting to the values based on the provided formatter or the default
   * formatter. If an error occurs during the report generation process, a `FormattingError` is thrown.
   */
  generateMarkdownReport = (reportData: ReportData): string => {
    try {
      const output = [`# ${reportData.title}`, ''];

      if (reportData.description) {
        output.push(reportData.description, '');
      }

      const sections = reportData.sections.map(this.generateSection);

      return output.concat(sections).join('\n');
    } catch (error) {
      throw new FormattingError(`Failed to generate report: ${(error as Error).message}`);
    }
  };

  /**
   * Formats a given number as a currency value using the configured locale and currency settings.
   *
   * @param value - The number to be formatted as currency.
   *
   * @returns The formatted currency value as a string.
   *
   * @remarks
   * This function uses the configured locale and currency settings to format the given number as a currency value.
   * The currency value is obtained from the 'currency' number formatter stored in the `formatters` map.
   *
   * @throws {FormattingError} - If the 'currency' number formatter is not found in the `formatters` map.
   *
   * @example
   * ```typescript
   * const formattingService = new FormattingService();
   * const formattedValue = formattingService.formatCurrency(12345.67);
   * console.log(formattedValue); // Output: $12,345.67
   * ```
   */
  formatCurrency = (value: number): string => {
    return this.formatters.get('currency')!.format(value);
  };

  /**
   * Formats a given number as a percentage value using the configured locale and percentage settings.
   *
   * @param value - The number to be formatted as a percentage. The value should be a number between 0 and 1,
   * where 1 represents 100%.
   *
   * @returns The formatted percentage value as a string.
   *
   * @remarks
   * This function uses the configured locale and percentage settings to format the given number as a percentage value.
   * The percentage value is obtained from the 'percentage' number formatter stored in the `formatters` map.
   *
   * @throws {FormattingError} - If the 'percentage' number formatter is not found in the `formatters` map.
   *
   * @example
   * ```typescript
   * const formattingService = new FormattingService();
   * const formattedValue = formattingService.formatPercentage(0.5);
   * console.log(formattedValue); // Output: 50%
   * ```
   */
  formatPercentage = (value: number): string => {
    return this.formatters.get('percentage')!.format(value);
  };
}

export default FormattingService;
