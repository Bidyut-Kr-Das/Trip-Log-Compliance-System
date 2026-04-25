import { useState, useEffect, useMemo, useRef } from "react";
import ELDLogBook from "./eld/ELDLogBook";
import type { TripTimelineResponse, TimelineDay } from "../types/route";
import type { TimelineEvent } from "../types/eldTimeline";
import {
  injectContinuityEvent,
  getLastEventStatus,
  applyGlobalContinuity,
} from "../utils/eldTimeline";
import { generateELDPDF } from "../utils/pdfExport";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

type Props = {
  timelineData?: TripTimelineResponse | null;
};

export default function LogPanel({ timelineData }: Props) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  // Get available days from timeline data or empty array
  const timelineDays = timelineData?.timeline_days ?? [];
  const totalDays = timelineDays.length;
  const activeDay = totalDays > 0 ? timelineDays[selectedDayIndex] : null;

  // Derive start status for the active day based on previous day's end
  // or default to 'off_duty' for day 1
  const activeDayWithContinuity = useMemo(() => {
    if (!activeDay) {
      return null;
    }

    const isFirstDay = selectedDayIndex === 0;

    if (isFirstDay) {
      // Day 1: default start status is 'off_duty'
      const eventsWithContinuity = injectContinuityEvent(
        activeDay.events || [],
        "off_duty",
      );
      return {
        ...activeDay,
        events: eventsWithContinuity,
      };
    }

    // Day N (N > 1): derive start status from previous day's last event
    const previousDay = timelineDays[selectedDayIndex - 1];
    if (!previousDay) {
      // Fallback (shouldn't happen if index is valid)
      const eventsWithContinuity = injectContinuityEvent(
        activeDay.events || [],
        "off_duty",
      );
      return {
        ...activeDay,
        events: eventsWithContinuity,
      };
    }

    const previousDayLastStatus = getLastEventStatus(previousDay.events || []);
    const eventsWithContinuity = injectContinuityEvent(
      activeDay.events || [],
      previousDayLastStatus,
    );

    return {
      ...activeDay,
      events: eventsWithContinuity,
    };
  }, [activeDay, selectedDayIndex, timelineDays]);

  // Reset index when timeline data changes
  useEffect(() => {
    setSelectedDayIndex(0);
  }, [timelineData]);

  // Clamp index if it exceeds available days
  useEffect(() => {
    if (selectedDayIndex >= totalDays && totalDays > 0) {
      setSelectedDayIndex(totalDays - 1);
    }
  }, [totalDays, selectedDayIndex]);

  const handlePrevDay = () => {
    setSelectedDayIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextDay = () => {
    setSelectedDayIndex((prev) => Math.min(totalDays - 1, prev + 1));
  };

  const isPrevDisabled = selectedDayIndex === 0 || totalDays === 0;
  const isNextDisabled = selectedDayIndex === totalDays - 1 || totalDays === 0;

  // Prepare all days with continuity for PDF export
  const allDaysWithContinuity = useMemo(() => {
    return applyGlobalContinuity(timelineDays);
  }, [timelineDays]);

  // Handle PDF export
  const handleExportPDF = async () => {
    if (totalDays === 0) {
      setExportError("No timeline data available for export.");
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      // Generate filename with first and last day dates
      const firstDate = timelineDays[0]?.date || "logs";
      const lastDate = timelineDays[timelineDays.length - 1]?.date || "logs";
      const filename =
        totalDays === 1
          ? `eld-log-${firstDate}.pdf`
          : `eld-logs-${firstDate}-to-${lastDate}.pdf`;

      await generateELDPDF("#pdf-export-container", filename);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate PDF";
      setExportError(message);
      console.error("PDF export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full w-full overflow-hidden bg-linear-to-b from-slate-50 to-slate-100 p-4">
      {/* Hidden export container - renders all days off-screen */}
      <div
        ref={exportContainerRef}
        id="pdf-export-container"
        className="fixed pointer-events-none"
        style={{
          left: 0,
          top: 0,
          opacity: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "white",
          zIndex: -9999,
        }}
      >
        {allDaysWithContinuity.map((day, index) => (
          <div
            key={`export-day-${index}`}
            className="pdf-export-page"
            style={{
              width: "1100px",
              height: "850px",
              overflow: "hidden",
              pageBreakAfter: "always",
              flexShrink: 0,
            }}
          >
            <ELDLogBook timelineDay={day} />
          </div>
        ))}
      </div>

      {/* Large card container with responsive top margin */}
      <div className="mx-4 mt-16 flex h-[calc(100%-(--spacing(24))-(--spacing(8)))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl  ">
        {/* Sheet content - scrollable main area */}
        <div className="flex-1 overflow-y-auto">
          {activeDayWithContinuity ? (
            <ELDLogBook timelineDay={activeDayWithContinuity} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-slate-500">
                No timeline data available. Submit a trip to generate logs.
              </p>
            </div>
          )}
        </div>

        {/* Footer with heading and pagination */}
        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="mb-4 flex flex-col items-center gap-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Driver Logbook
            </h2>
            {activeDay && (
              <span className="text-xs text-slate-500">{activeDay.date}</span>
            )}
          </div>

          {/* Error message */}
          {exportError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {exportError}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            {/* Left pagination or spacer */}
            {totalDays > 1 && (
              <button
                type="button"
                onClick={handlePrevDay}
                disabled={isPrevDisabled}
                aria-label="Previous day"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {totalDays <= 1 && <div className="h-9 w-9" />}

            {/* Center: day counter and export button */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold text-slate-900">
                  {totalDays > 0
                    ? `Day ${selectedDayIndex + 1} of ${totalDays}`
                    : "No days"}
                </span>
              </div>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting || totalDays === 0}
                aria-label="Download PDF"
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {isExporting ? "Generating…" : "Download PDF"}
              </button>
            </div>

            {/* Right pagination or spacer */}
            {totalDays > 1 && (
              <button
                type="button"
                onClick={handleNextDay}
                disabled={isNextDisabled}
                aria-label="Next day"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {totalDays <= 1 && <div className="h-9 w-9" />}
          </div>
        </div>
      </div>
    </div>
  );
}
