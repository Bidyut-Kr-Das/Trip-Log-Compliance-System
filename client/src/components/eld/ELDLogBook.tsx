import { useMemo, useState, type ChangeEvent, useEffect } from "react";
import { EXAMPLE_TIMELINE_EVENTS } from "../../types/eldTimeline";
import type { TimelineDay } from "../../types/route";
import type { TimelineSegment } from "../../types/eldTimeline";
import {
  buildTimelinePlotPaths,
  buildDrivingRemarkMarkers,
  normalizeEventsToSegments,
} from "../../utils/eldTimeline";

type Props = {
  timelineDay?: TimelineDay | null
}

type FormData = {
  month: string;
  day: string;
  year: string;
  from: string;
  to: string;
  totalMilesDriving: string;
  totalMileage: string;
  truckTrailer: string;
  carrier: string;
  mainOffice: string;
  homeTerminal: string;
  remarks: string;
  shippingDocs: string;
  dvlManifest: string;
  shipperCommodity: string;
};

type Grid = boolean[][];

type DutyStatusRow = {
  id: number;
  label: string;
};

type PlotStatus =
  | "off_duty"
  | "sleeper_berth"
  | "driving"
  | "on_duty_not_driving";

const HOURS = [
  "Mid-night",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
] as const;

const DUTY_STATUSES: readonly DutyStatusRow[] = [
  { id: 1, label: "1. Off Duty" },
  { id: 2, label: "2. Sleeper Berth" },
  { id: 3, label: "3. Driving" },
  { id: 4, label: "4. On Duty\n(not driving)" },
];

const ROW_HEIGHT = 44;

const PLOT_STATUS_ORDER: readonly PlotStatus[] = [
  "off_duty",
  "sleeper_berth",
  "driving",
  "on_duty_not_driving",
];

/**
 * Calculate total hours per duty status from timeline segments.
 * Returns array of [off_duty_hours, sleeper_berth_hours, driving_hours, on_duty_not_driving_hours]
 */
function calculateHoursByStatus(segments: TimelineSegment[]): number[] {
  const hours = [0, 0, 0, 0]; // one per PLOT_STATUS_ORDER

  segments.forEach((segment) => {
    const statusIndex = PLOT_STATUS_ORDER.indexOf(segment.status);
    if (statusIndex !== -1) {
      const quarters = segment.endQuarter - segment.startQuarter;
      hours[statusIndex] += quarters / 4; // convert quarters to hours
    }
  });

  return hours;
}

type GridRowProps = {
  label: string;
  rowIndex: number;
  grid: Grid;
  onCellToggle: (row: number, col: number) => void;
  totalHours: number;
};

function GridRow({
  label,
  rowIndex,
  grid,
  onCellToggle,
  totalHours,
}: GridRowProps) {
  return (
    <div
      className="flex items-stretch"
      style={{ borderBottom: "1px solid #000", height: `${ROW_HEIGHT}px` }}
    >
      {/* Row label */}
      <div
        className="flex items-center justify-start px-1 bg-white"
        style={{
          width: "110px",
          minWidth: "110px",
          fontSize: "10px",
          fontWeight: "600",
          whiteSpace: "pre-line",
          lineHeight: "1.3",
          borderRight: "1px solid #000",
          color: "#000",
        }}
      >
        {label}
      </div>

      {/* Plotting area — white, 24 hour boxes */}
      <div className="flex-1 flex" style={{ backgroundColor: "#fff" }}>
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={h}
            style={{
              flex: 1,
              position: "relative",
              borderRight: "1px solid #000",
              height: "100%",
              overflow: "hidden",
            }}
          >
            {/* 4 clickable quarter-hour bands */}
            <div style={{ display: "flex", height: "100%" }}>
              {Array.from({ length: 4 }).map((_, t) => {
                const cellIdx = h * 4 + t;
                const isActive = grid[rowIndex]?.[cellIdx];
                return (
                  <div
                    key={t}
                    // onClick={() => onCellToggle(rowIndex, cellIdx)} 
                    style={{
                      flex: 1,
                      height: "100%",
                      backgroundColor: isActive ? "#000" : "transparent",
                      // cursor: "pointer",
                    }}
                    // onMouseEnter={(e) => {
                    //   if (!isActive)
                    //     e.currentTarget.style.backgroundColor =
                    //       "rgba(0,0,0,0.07)";
                    // }}
                    // onMouseLeave={(e) => {
                    //   if (!isActive)
                    //     e.currentTarget.style.backgroundColor = "transparent";
                    // }}
                  />
                );
              })}
            </div>

            {/* :15 tick — 1/4 height from bottom, dashed */}
            <div
              style={{
                position: "absolute",
                left: "25%",
                bottom: 0,
                width: "1px",
                height: `${ROW_HEIGHT * 0.25}px`,
                borderLeft: "1px dashed #000",
                pointerEvents: "none",
              }}
            />
            {/* :30 tick — 1/2 height from bottom, solid */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: 0,
                width: "1px",
                height: `${ROW_HEIGHT * 0.5}px`,
                borderLeft: "1px solid #000",
                pointerEvents: "none",
              }}
            />
            {/* :45 tick — 1/4 height from bottom, dashed */}
            <div
              style={{
                position: "absolute",
                left: "75%",
                bottom: 0,
                width: "1px",
                height: `${ROW_HEIGHT * 0.25}px`,
                borderLeft: "1px dashed #000",
                pointerEvents: "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* Total hours */}
      <div
        className="flex items-center justify-center bg-white"
        style={{
          width: "50px",
          minWidth: "50px",
          fontSize: "11px",
          borderLeft: "1px solid #000",
          color: "#000",
          fontWeight: "bold",
        }}
      >
        {totalHours > 0 ? totalHours.toFixed(2) : ""}
      </div>
    </div>
  );
}

export default function DriversLog({ timelineDay }: Props) {
  const [formData, setFormData] = useState<FormData>({
    month: "",
    day: "",
    year: "",
    from: "",
    to: "",
    totalMilesDriving: "",
    totalMileage: "",
    truckTrailer: "",
    carrier: "",
    mainOffice: "",
    homeTerminal: "",
    remarks: "",
    shippingDocs: "",
    dvlManifest: "",
    shipperCommodity: "",
  });

  // Grid state: 4 rows x 96 cells
  const [grid, setGrid] = useState<Grid>(
    Array.from({ length: 4 }, () => Array(96).fill(false)),
  );

  // Auto-fill date fields from timelineDay.date when day changes
  useEffect(() => {
    if (timelineDay?.date) {
      const [year, month, day] = timelineDay.date.split('-');
      setFormData((prev) => ({
        ...prev,
        month: month || '',
        day: day || '',
        year: year || '',
      }));
    }
  }, [timelineDay?.date]);

  // Use timeline data from props if available, otherwise use example
  const timelineEvents = useMemo(() => {
    if (timelineDay?.events && timelineDay.events.length > 0) {
      return timelineDay.events;
    }
    // Fallback to example events
    return EXAMPLE_TIMELINE_EVENTS;
  }, [timelineDay]);

  const timelineSegments = useMemo(
    () => normalizeEventsToSegments(timelineEvents),
    [timelineEvents],
  );

  const plotPaths = useMemo(
    () =>
      buildTimelinePlotPaths(
        timelineSegments,
        (status) =>
          PLOT_STATUS_ORDER.indexOf(status) * ROW_HEIGHT + ROW_HEIGHT / 2,
        (quarter) => quarter,
      ),
    [timelineSegments],
  );

  const remarkMarkers = useMemo(
    () => buildDrivingRemarkMarkers(timelineSegments),
    [timelineSegments],
  );

  // Calculate total hours per status from timeline segments
  const hoursByStatus = useMemo(
    () => calculateHoursByStatus(timelineSegments),
    [timelineSegments],
  );

  const handleCellToggle = (row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = !next[row][col];
      return next;
    });
  };

  const handleInput =
    (field: keyof FormData) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const inputClass =
    "border-b border-black bg-transparent outline-none text-xs w-full px-0.5 py-0";

  return (
    <div
      className="w-full bg-white text-black"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        width: "100%",
        maxWidth: "none",
        boxSizing: "border-box",
        // border: "2px solid black", 
        padding: "16px 20px",
        fontSize: "12px",
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "900",
              letterSpacing: "-0.5px",
            }}
          >
            Drivers Daily Log
          </div>
          <div style={{ fontSize: "11px" }}>(24 hours)</div>
        </div>
        <div className="flex items-end gap-2 text-xs">
          <div className="flex flex-col items-center">
            <input
              className="border-b border-black outline-none text-center bg-transparent"
              style={{ width: "44px", fontSize: "12px" }}
              placeholder=""
              value={formData.month}
              onChange={handleInput("month")}
            />
            <span style={{ fontSize: "10px" }}>(month)</span>
          </div>
          <span className="pb-1">/</span>
          <div className="flex flex-col items-center">
            <input
              className="border-b border-black outline-none text-center bg-transparent"
              style={{ width: "34px", fontSize: "12px" }}
              placeholder=""
              value={formData.day}
              onChange={handleInput("day")}
            />
            <span style={{ fontSize: "10px" }}>(day)</span>
          </div>
          <span className="pb-1">/</span>
          <div className="flex flex-col items-center">
            <input
              className="border-b border-black outline-none text-center bg-transparent"
              style={{ width: "52px", fontSize: "12px" }}
              placeholder=""
              value={formData.year}
              onChange={handleInput("year")}
            />
            <span style={{ fontSize: "10px" }}>(year)</span>
          </div>
        </div>
        <div
          style={{ fontSize: "10px", textAlign: "right", lineHeight: "1.5" }}
        >
          <div>Original - File at home terminal.</div>
          <div>
            Duplicate - Driver retains in his/her possession for 8 days.
          </div>
        </div>
      </div>

      {/* ── FROM / TO ── */}
      <div className="flex gap-4 mb-2">
        <div className="flex-1">
          <div className="mb-0.5 text-sm font-bold">From:</div>
          <input
            className={inputClass}
            value={formData.from}
            onChange={handleInput("from")}
          />
        </div>
        <div className="flex-1">
          <div className="mb-0.5 text-sm font-bold">To:</div>
          <input
            className={inputClass}
            value={formData.to}
            onChange={handleInput("to")}
          />
        </div>
      </div>

      {/* ── MILEAGE / CARRIER ROW ── */}
      <div className="flex gap-2 mb-2">
        <div className="flex gap-2" style={{ flex: "0 0 auto" }}>
          <div>
            <div
              className="border border-black"
              style={{ width: "96px", height: "32px", padding: "2px" }}
            >
              <input
                className="w-full bg-transparent text-center text-sm outline-none"
                value={formData.totalMilesDriving}
                onChange={handleInput("totalMilesDriving")}
              />
            </div>
            <div style={{ fontSize: "10px", textAlign: "center" }}>
              Total Miles Driving Today
            </div>
          </div>
          <div>
            <div
              className="border border-black"
              style={{ width: "96px", height: "32px", padding: "2px" }}
            >
              <input
                className="w-full bg-transparent text-center text-sm outline-none"
                value={formData.totalMileage}
                onChange={handleInput("totalMileage")}
              />
            </div>
            <div style={{ fontSize: "10px", textAlign: "center" }}>
              Total Mileage Today
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div
            className="border-b border-black"
            style={{ height: "32px", padding: "2px" }}
          >
            <input
              className="w-full bg-transparent text-sm outline-none"
              value={formData.carrier}
              onChange={handleInput("carrier")}
            />
          </div>
          <div style={{ fontSize: "10px" }}>Name of Carrier or Carriers</div>
        </div>
      </div>

      {/* ── TRUCK / MAIN OFFICE / HOME TERMINAL ── */}
      <div className="flex gap-2 mb-2">
        <div style={{ flex: "0 0 200px" }}>
          <div
            className="border-b border-black"
            style={{ height: "32px", padding: "2px" }}
          >
            <input
              className="w-full bg-transparent text-sm outline-none"
              value={formData.truckTrailer}
              onChange={handleInput("truckTrailer")}
            />
          </div>
          <div style={{ fontSize: "10px", lineHeight: "1.2" }}>
            Truck/Tractor and Trailer Numbers or
            <br />
            License Plate(s)/State (show each unit)
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div>
            <div
              className="border-b border-black"
              style={{ height: "26px", padding: "2px" }}
            >
              <input
                className="w-full bg-transparent text-sm outline-none"
                value={formData.mainOffice}
                onChange={handleInput("mainOffice")}
              />
            </div>
            <div style={{ fontSize: "10px" }}>Main Office Address</div>
          </div>
          <div>
            <div
              className="border-b border-black"
              style={{ height: "26px", padding: "2px" }}
            >
              <input
                className="w-full bg-transparent text-sm outline-none"
                value={formData.homeTerminal}
                onChange={handleInput("homeTerminal")}
              />
            </div>
            <div style={{ fontSize: "10px" }}>Home Terminal Address</div>
          </div>
        </div>
      </div>

      {/* ── GRID SECTION ── */}
      <div
        className="mt-2"
        style={{ border: "2px solid #555", backgroundColor: "#1a1a1a" }}
      >
        {/* Hour labels row */}
        <div
          className="flex"
          style={{ backgroundColor: "#2a2a2a", borderBottom: "1px solid #777" }}
        >
          <div
            style={{
              width: "110px",
              minWidth: "110px",
              borderRight: "2px solid #555",
              padding: "2px 4px",
              color: "white",
              fontSize: "11px",
              fontFamily: "'Courier New', monospace",
              fontWeight: "bold",
            }}
          >
            Mid-night
          </div>
          <div className="flex-1 flex">
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className="flex-1 flex items-center justify-end"
                style={{
                  color: "white",
                  fontSize: "11px",
                  padding: "2px 4px 2px 0",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: "bold",
                  textAlign: "right",
                  lineHeight: "1",
                }}
              >
                {HOURS[h + 1]}
              </div>
            ))}
          </div>
          <div
            style={{
              width: "50px",
              minWidth: "50px",
              color: "white",
              fontSize: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              lineHeight: "1.2",
              padding: "2px",
              borderLeft: "2px solid #555",
              fontFamily: "'Courier New', monospace",
              fontWeight: "bold",
            }}
          >
            Total
            <br />
            Hours
          </div>
        </div>

        <div className="relative">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute top-0"
            style={{ left: "110px", width: "calc(100% - 160px)" }}
            height={ROW_HEIGHT * 4}
            viewBox="0 0 96 176"
            preserveAspectRatio="none"
          >
            {plotPaths.horizontalPath ? (
              <path
                d={plotPaths.horizontalPath}
                fill="none"
                stroke="#000"
                strokeWidth="2.2"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="butt"
                strokeLinejoin="miter"
              />
            ) : null}
            {plotPaths.verticalPath ? (
              <path
                d={plotPaths.verticalPath}
                fill="none"
                stroke="#000"
                strokeWidth="2.2"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="butt"
                strokeLinejoin="miter"
              />
            ) : null}
          </svg>

          {/* Duty rows */}
          {DUTY_STATUSES.map((status, idx) => {
            const totalHours = hoursByStatus[idx] || 0;
            return (
              <GridRow
                key={status.id}
                label={status.label}
                rowIndex={idx}
                grid={grid}
                onCellToggle={handleCellToggle}
                totalHours={totalHours}
              />
            );
          })}
        </div>
      </div>

      {/* ── REMARKS ── */}
      <div className="mt-3">
        <div className="mb-1 text-lg font-bold">Remarks</div>
        <div className="border-b border-black mb-1" style={{ height: "1px" }} />
        {/* <div className="relative mb-2 h-28 overflow-hidden border-b border-black">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            viewBox="0 0 96 28"
            preserveAspectRatio="none"
          >
            {remarkMarkers.map((marker, index) => {
              const startX = marker.startQuarter
              const endX = Math.max(marker.endQuarter, marker.startQuarter + 1)
              const topY = marker.kind === 'boxed' ? 8 : 14
              const bottomY = 24
              const boxHeight = bottomY - topY
              const title = marker.city ?? 'Status change'
              const note = marker.remark ?? ''

              return (
                <g key={`${marker.kind}-${marker.startQuarter}-${marker.endQuarter}-${index}`}>
                  {marker.kind === 'boxed' ? (
                    <>
                      <path
                        d={`M ${startX} ${bottomY} L ${startX} ${topY} L ${endX} ${topY} L ${endX} ${bottomY}`}
                        fill="none"
                        stroke="#000"
                        strokeWidth="1.3"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="butt"
                        strokeLinejoin="miter"
                      />
                      <path
                        d={`M ${startX} ${bottomY} L ${startX - 5} ${bottomY - 5}`}
                        fill="none"
                        stroke="#000"
                        strokeWidth="1.3"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="butt"
                        strokeLinejoin="miter"
                      />
                    </>
                  ) : (
                    <path
                      d={`M ${startX} ${bottomY} L ${startX - 5} ${bottomY - 5}`}
                      fill="none"
                      stroke="#000"
                      strokeWidth="1.3"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="butt"
                      strokeLinejoin="miter"
                    />
                  )}
                  <text
                    x={startX - 2}
                    y={marker.kind === 'boxed' ? topY + boxHeight / 2 : bottomY - 7}
                    fill="#000"
                    fontFamily="'Courier New', monospace"
                    fontSize="3.5"
                    fontWeight="700"
                    transform={`rotate(-45 ${startX - 2} ${marker.kind === 'boxed' ? topY + boxHeight / 2 : bottomY - 7})`}
                  >
                    {title}
                    {note ? `  ${note}` : ''}
                  </text>
                </g>
              )
            })}
          </svg>
        </div> */}
        <textarea
          className="w-full resize-none border-b border-black bg-transparent text-base outline-none"
          rows={3}
          value={formData.remarks}
          onChange={handleInput("remarks")}
        />
      </div>

      {/* ── SHIPPING DOCUMENTS ── */}
      <div className="mt-3">
        <div className="text-base font-bold">Shipping Documents:</div>
        <textarea
          className="mt-1 w-full resize-none border-b border-black bg-transparent text-base outline-none"
          rows={2}
          value={formData.shippingDocs}
          onChange={handleInput("shippingDocs")}
        />
      </div>

      {/* ── DVL / SHIPPER ── */}
      <div className="flex gap-4 mt-2">
        <div style={{ flex: "0 0 200px" }}>
          <div className="text-base font-bold">DVL or Manifest No.</div>
          <div className="text-base font-bold">or</div>
          <input
            className={inputClass + " mt-1"}
            value={formData.dvlManifest}
            onChange={handleInput("dvlManifest")}
          />
        </div>
        <div className="flex-1">
          <div className="text-base font-bold">Shipper &amp; Commodity</div>
          <input
            className={inputClass + " mt-1"}
            value={formData.shipperCommodity}
            onChange={handleInput("shipperCommodity")}
          />
        </div>
      </div>

      {/* ── INSTRUCTIONS ── */}
      <div className="mt-3 text-center" style={{ fontSize: "11px" }}>
        <div>
          Enter name of place you reported and where released from work and when
          and where each change of duty occurred.
        </div>
        <div>Use time standard of home terminal.</div>
      </div>

      {/* ── RECAP TABLE ── */}
      <div className="mt-3 border border-black">
        <div className="flex">
          {/* Left label */}
          <div
            className="flex flex-col justify-start border-r border-black p-1"
            style={{ width: "90px", fontSize: "11px" }}
          >
            <div className="font-bold">Recap:</div>
            <div>Complete at</div>
            <div>end of day</div>
          </div>

          {/* 70 Hour / 8 Day */}
          <div className="flex-1 border-r border-black">
            <div
              className="text-center font-bold border-b border-black py-0.5"
              style={{ fontSize: "11px" }}
            >
              70 Hour/ 8 Day
            </div>
            <div className="flex">
              <div
                className="flex-1 border-r border-black p-0.5 text-center"
                style={{ fontSize: "10px" }}
              >
                Drivers
              </div>
              <div
                className="flex-1 border-r border-black p-0.5 text-center"
                style={{ fontSize: "8px" }}
              >
                A.
              </div>
              <div
                className="flex-1 border-r border-black p-0.5 text-center"
                style={{ fontSize: "8px" }}
              >
                B.
              </div>
              <div
                className="flex-1 p-0.5 text-center"
                style={{ fontSize: "8px" }}
              >
                C.
              </div>
            </div>
            <div className="flex" style={{ fontSize: "9px" }}>
              <div
                className="flex-1 border-r border-black p-0.5"
                style={{ lineHeight: "1.2" }}
              >
                On duty hours today. Total lines 3 &amp; 4
              </div>
              <div
                className="flex-1 border-r border-black p-0.5"
                style={{ lineHeight: "1.2" }}
              >
                A. Total hours on duty last 7 days including today.
              </div>
              <div
                className="flex-1 border-r border-black p-0.5"
                style={{ lineHeight: "1.2" }}
              >
                B. Total hours available tomorrow 70 hr. minus A*
              </div>
              <div className="flex-1 p-0.5" style={{ lineHeight: "1.2" }}>
                C. Total hours on duty last 8 days including today.
              </div>
            </div>
          </div>

          {/* 60 Hour / 7 Day */}
          <div className="flex-1 border-r border-black">
            <div
              className="text-center font-bold border-b border-black py-0.5"
              style={{ fontSize: "11px" }}
            >
              60 Hour/ 7 Day Drivers
            </div>
            <div className="flex">
              <div
                className="flex-1 border-r border-black p-0.5 text-center"
                style={{ fontSize: "10px" }}
              >
                A.
              </div>
              <div
                className="flex-1 border-r border-black p-0.5 text-center"
                style={{ fontSize: "8px" }}
              >
                B.
              </div>
              <div
                className="flex-1 p-0.5 text-center"
                style={{ fontSize: "8px" }}
              >
                C.
              </div>
            </div>
            <div className="flex" style={{ fontSize: "9px" }}>
              <div
                className="flex-1 border-r border-black p-0.5"
                style={{ lineHeight: "1.2" }}
              >
                A. Total hours on duty last 7 days including today.
              </div>
              <div
                className="flex-1 border-r border-black p-0.5"
                style={{ lineHeight: "1.2" }}
              >
                B. Total hours available tomorrow 60 hr. minus A*
              </div>
              <div className="flex-1 p-0.5" style={{ lineHeight: "1.2" }}>
                C. Total hours on duty last 8 days including today.
              </div>
            </div>
          </div>

          {/* Note */}
          <div
            className="p-1"
            style={{ width: "110px", fontSize: "9px", lineHeight: "1.3" }}
          >
            *If you took 34 consecutive hours off duty you have 60/70 hours
            available
          </div>
        </div>
      </div>
    </div>
  );
}
