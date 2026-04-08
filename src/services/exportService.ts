// Export Service - CSV and Excel generation with institutional branding
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Institutional brand colors (matching PDF service)
const BRAND = 'MicroLoan Hub';
const BRAND_SUBTITLE = 'Instituição de Microcrédito';

const COLORS = {
  primary: 'FF0F3460', // Navy Blue
  accent: 'FF006699', // Accent Blue
  gold: 'FFB28F40', // Gold
  dark: 'FF212529', // Dark text
  muted: 'FF6C757D', // Muted text
  light: 'FFF1F3F5', // Light background
  white: 'FFFFFFFF', // White
  success: 'FF198754', // Green
  danger: 'FFB02A37', // Red
  headerBg: 'FF0F3460', // Header background (navy)
  altRowBg: 'FFF8F9FA', // Alternating row background
  borderColor: 'FFD1D5DB', // Border color
};

export type ExportColumn<T extends Record<string, unknown>> = {
  key: keyof T;
  label: string;
  width?: number;
  format?: 'currency' | 'percent' | 'date' | 'number';
};

type SummaryRow = {
  label: string;
  formula?: string;
  value?: number | string;
};

type ExcelExportOptions<T extends Record<string, unknown>> = {
  sheetName?: string;
  title?: string;
  subtitle?: string;
  columns?: ExportColumn<T>[];
  summaryRows?: SummaryRow[];
};

class ExportService {
  /**
   * Export data to CSV
   */
  exportToCSV<T extends Record<string, unknown>>(
    data: T[],
    filename: string,
    columns?: ExportColumn<T>[]
  ): void {
    if (data.length === 0) return;

    const cols =
      columns ||
      Object.keys(data[0]).map((key) => ({
        key: key as keyof T,
        label: key as string,
      }));

    const escapeCSVValue = (value: unknown): string => {
      if (value === null || value === undefined) return '';

      const str = String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = cols.map((c) => escapeCSVValue(c.label)).join(',');

    const rows = data.map((item) =>
      cols
        .map((col) => {
          const value = item[col.key];
          return escapeCSVValue(value);
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');

    // BOM para Excel reconhecer UTF-8 corretamente
    const BOM = '\uFEFF';

    const blob = new Blob([BOM + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export data to Excel with institutional formatting
   */
  async exportToExcel<T extends Record<string, unknown>>(
    data: T[],
    filename: string,
    options?: ExcelExportOptions<T>
  ): Promise<void> {
    if (data.length === 0) return;

    const wb = new ExcelJS.Workbook();
    wb.creator = BRAND;
    wb.created = new Date();

    const sheetName = options?.sheetName || 'Relatório';
    const ws = wb.addWorksheet(sheetName, {
      properties: { defaultRowHeight: 18 },
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });

    const cols: ExportColumn<T>[] =
      options?.columns ||
      Object.keys(data[0]).map((key) => ({
        key: key as keyof T,
        label: key as string,
      }));

    const colCount = cols.length;

    // ── HEADER AREA ──
    const brandRow = ws.addRow([BRAND]);
    ws.mergeCells(1, 1, 1, colCount);
    brandRow.height = 32;
    const brandCell = brandRow.getCell(1);
    brandCell.font = {
      name: 'Arial',
      size: 16,
      bold: true,
      color: { argb: COLORS.primary },
    };
    brandCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const subRow = ws.addRow([BRAND_SUBTITLE]);
    ws.mergeCells(2, 1, 2, colCount);
    subRow.height = 18;
    const subCell = subRow.getCell(1);
    subCell.font = {
      name: 'Arial',
      size: 9,
      italic: true,
      color: { argb: COLORS.muted },
    };

    const accentRow = ws.addRow([]);
    accentRow.height = 4;
    for (let c = 1; c <= colCount; c++) {
      accentRow.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.gold },
      };
    }

    const title = options?.title || filename.replace(/_/g, ' ');
    const titleRow = ws.addRow([title]);
    ws.mergeCells(4, 1, 4, colCount);
    titleRow.height = 28;
    const titleCell = titleRow.getCell(1);
    titleCell.font = {
      name: 'Arial',
      size: 13,
      bold: true,
      color: { argb: COLORS.dark },
    };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };

    const reportInfo =
      options?.subtitle ||
      `Gerado em ${new Date().toLocaleDateString('pt-MZ', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })} • ${data.length} registos`;

    const infoRow = ws.addRow([reportInfo]);
    ws.mergeCells(5, 1, 5, colCount);
    infoRow.height = 20;
    const infoCell = infoRow.getCell(1);
    infoCell.font = {
      name: 'Arial',
      size: 9,
      color: { argb: COLORS.muted },
    };

    ws.addRow([]).height = 8;

    // ── TABLE HEADERS (Row 7) ──
    const headerValues = cols.map((c) => c.label);
    const headerRow = ws.addRow(headerValues);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: COLORS.white },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.headerBg },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        bottom: { style: 'medium', color: { argb: COLORS.gold } },
      };
    });

    // ── DATA ROWS ──
    data.forEach((item, rowIdx) => {
      const values = cols.map((col) => {
        const v = item[col.key];
        return v === null || v === undefined ? '' : v;
      });

      const row = ws.addRow(values);
      row.height = 22;

      row.eachCell((cell, colNumber) => {
        const colDef = cols[colNumber - 1];

        cell.font = {
          name: 'Arial',
          size: 9.5,
          color: { argb: COLORS.dark },
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: typeof cell.value === 'number' ? 'right' : 'left',
        };

        if (rowIdx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.altRowBg },
          };
        }

        cell.border = {
          bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
        };

        switch (colDef.format) {
          case 'currency':
            cell.numFmt = '#,##0.00 "MT"';
            cell.alignment = { ...cell.alignment, horizontal: 'right' };
            break;
          case 'percent':
            cell.numFmt = '0.0%';
            cell.alignment = { ...cell.alignment, horizontal: 'center' };
            break;
          case 'number':
            cell.numFmt = '#,##0';
            cell.alignment = { ...cell.alignment, horizontal: 'right' };
            break;
          case 'date':
            cell.alignment = { ...cell.alignment, horizontal: 'center' };
            break;
          default:
            if (typeof cell.value === 'number') {
              cell.numFmt = '#,##0.00';
            }
            break;
        }
      });
    });

    // ── SUMMARY ROWS ──
    if (options?.summaryRows && options.summaryRows.length > 0) {
      ws.addRow([]).height = 4;

      options.summaryRows.forEach((sr) => {
        const summaryValues = new Array(colCount).fill('');
        summaryValues[0] = sr.label;
        if (sr.value !== undefined) {
          summaryValues[colCount - 1] = sr.value;
        }

        const row = ws.addRow(summaryValues);
        row.height = 24;

        row.getCell(1).font = {
          name: 'Arial',
          size: 10,
          bold: true,
          color: { argb: COLORS.primary },
        };
        row.getCell(1).alignment = {
          horizontal: 'left',
          vertical: 'middle',
        };

        if (sr.value !== undefined) {
          const lastCell = row.getCell(colCount);
          lastCell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: COLORS.primary },
          };

          if (typeof sr.value === 'number') {
            lastCell.numFmt = '#,##0.00 "MT"';
          }

          lastCell.alignment = {
            horizontal: 'right',
            vertical: 'middle',
          };
        }

        for (let c = 1; c <= colCount; c++) {
          row.getCell(c).border = {
            top: { style: 'medium', color: { argb: COLORS.gold } },
          };
        }
      });
    }

    // ── FOOTER ──
    const footerGap = ws.addRow([]);
    footerGap.height = 12;

    const footerRow = ws.addRow([
      'CONFIDENCIAL • Documento gerado electronicamente pelo sistema de gestão MicroLoan Hub',
    ]);
    ws.mergeCells(footerRow.number, 1, footerRow.number, colCount);
    footerRow.getCell(1).font = {
      name: 'Arial',
      size: 7.5,
      italic: true,
      color: { argb: COLORS.muted },
    };
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    // ── COLUMN WIDTHS ──
    cols.forEach((col, idx) => {
      const wsCol = ws.getColumn(idx + 1);

      if (col.width) {
        wsCol.width = col.width;
      } else {
        const headerLen = String(col.label).length;
        const maxDataLen = data.slice(0, 50).reduce((max, item) => {
          const val = String(item[col.key] ?? '');
          return Math.max(max, val.length);
        }, 0);

        wsCol.width = Math.min(Math.max(headerLen, maxDataLen, 10) + 4, 40);
      }
    });

    // ── AUTO-FILTER ──
    ws.autoFilter = {
      from: { row: 7, column: 1 },
      to: { row: 7, column: colCount },
    };

    // ── FREEZE PANES ──
    ws.views = [{ state: 'frozen', ySplit: 7, xSplit: 0, activeCell: 'A8' }];

    // ── PRINT SETTINGS ──
    ws.headerFooter.oddFooter = `&L${BRAND}&CPágina &P de &N&R&D`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}

export const exportService = new ExportService();