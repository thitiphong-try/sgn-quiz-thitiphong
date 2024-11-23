/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Papa from "papaparse";
import { FaPlay, FaPause } from "react-icons/fa";

const App = () => {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(true); // สถานะการเล่นหรือหยุด
  const [currentIndex, setCurrentIndex] = useState(0);

  const updateChart = (yearData, width, height, margin, duration, svg, x, y, color) => {
    const sortedData = yearData.data.sort((a, b) => b.value - a.value);

    x.domain([0, d3.max(sortedData, (d) => d.value)]);
    y.domain(sortedData.map((d) => d.name));

    // X-axis
    svg
      .select(".x-axis")
      .transition()
      .duration(duration)
      .call(
        d3.axisTop(x)
          .ticks(5)
          .tickFormat(d3.format(",.0f"))
      ).attr("font-size", "12px");

    // Y-axis
    svg
      .select(".y-axis")
      .transition()
      .duration(duration)
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .attr("font-size", "14px")
      .style("transform", "translateX(400px)");

    // Dashed line
    const tickPositions = x.ticks(5); // Extract all tick positions from the X-axis
    const lineGroup = svg.selectAll(".dashed-line").data(tickPositions);

    lineGroup
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("class", "dashed-line")
            .attr("x1", (d) => x(d))
            .attr("y1", margin.top)
            .attr("x2", (d) => x(d))
            .attr("y2", height - margin.bottom)
            .attr("stroke", "#d3d3d3")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 4"), // Dotted line
        (update) =>
          update
            .transition()
            .duration(duration)
            .attr("x1", (d) => x(d))
            .attr("y1", margin.top)
            .attr("x2", (d) => x(d))
            .attr("y2", height - margin.bottom),
        (exit) => exit.remove()
      );

    // The bar chart is above the dashed line
    svg.selectAll(".bar").raise();

    // Update Bars
    const bars = svg.selectAll(".bar").data(sortedData, (d) => d.name);

    bars
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "bar")
            .attr("x", x(0))
            .attr("y", (d) => y(d.name))
            .attr("width", (d) => x(d.value) - x(0))
            .attr("height", y.bandwidth())
            .attr("fill", (d) => color(d.name)),
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(duration)
            .attr("width", 0)
            .remove()
      )
      .transition()
      .duration(duration)
      .attr("x", x(0))
      .attr("y", (d) => y(d.name))
      .attr("width", (d) => x(d.value) - x(0))
      .attr("height", y.bandwidth());

    // Update Labels
    const labels = svg.selectAll(".label").data(sortedData, (d) => d.name);
    labels
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", "label")
            .attr("x", (d) => Math.min(x(d.value) + 5, width - margin.right))
            .attr("y", (d) => y(d.name) + y.bandwidth() / 2)
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "middle")
            .attr("fill", "black")
            .text((d) => d.value.toLocaleString()),
        (update) => update,
        (exit) => exit.remove()
      )
      .transition()
      .duration(duration)
      .attr("x", (d) => Math.min(x(d.value) + 5, width - margin.right))
      .attr("y", (d) => y(d.name) + y.bandwidth() / 2)
      .text((d) => d.value.toLocaleString());

    // Display year
    svg.select(".year-label")
      .transition()
      .duration(duration)
      .text(`${yearData.year}`)
      .attr("x", width - margin.right)
      .attr("y", height - margin.bottom - 60)
      .attr("text-anchor", "end")
      .attr("font-size", "70px")
      .attr("fill", "black");

    // Display Total population in that year
    svg.select(".total-label")
      .transition()
      .duration(duration)
      .text(`Total: ${yearData.total.toLocaleString()}`)
      .attr("x", width - margin.right - 10)
      .attr("y", height - margin.bottom - 10)
      .attr("text-anchor", "end")
      .attr("font-size", "20px")
      .attr("fill", "black");

    // Update the arrow and current position on the timeline
    const adjustedIndex = currentIndex - 1;
    const progressX = margin.left + (adjustedIndex / (data.length - 1)) * (width - margin.left - margin.right);

    svg.select(".progress-arrow")
      .transition()
      .duration(duration)
      .attr("x1", progressX)
      .attr("x2", progressX);

    svg.select(".progress-indicator")
      .transition()
      .duration(duration)
      .attr("cx", progressX);

    svg.select(".progress-year")
      .transition()
      .duration(duration)
      .attr("x", progressX)
      .text(yearData.year);
  };

  useEffect(() => {
    // Load a CSV file and transform the data
    const loadCsvData = () => {
      Papa.parse("/population-and-demography.csv", {
        download: true,
        header: true,
        complete: (result) => {
          const rawData = result.data;

          // Group data by year
          const years = Array.from(new Set(rawData.map((d) => d.Year)));
          const formattedData = years.map((year) => {
            const yearData = rawData
              .filter((d) => d.Year === year)
              .map((d) => ({
                name: d["Country name"],
                value: +d.Population,
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 12); // Top 12

            return { year: +year, data: yearData, total: d3.sum(yearData, (d) => d.value) };
          });

          setData(formattedData);
        },
      });
    };

    loadCsvData();
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const width = 1200;
    const height = 600;
    const margin = { top: 50, right: 80, bottom: 80, left: 400 };
    const duration = 150;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleLinear().range([margin.left, width - margin.right]);
    const y = d3
      .scaleBand()
      .range([margin.top, height - margin.bottom])
      .padding(0.15);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const years = data.map((d) => d.year);

    // Scale of timeline
    const timelineScale = d3
      .scaleLinear()
      .domain([d3.min(years), d3.max(years)])
      .range([margin.left, width - margin.right]);

    const filteredYears = years.filter((year) => year % 4 === 0);

    // --------------------------------------------------------------------------- : Start Display Year & Population current run time
    // Display year current run time
    svg.append("text")
      .attr("class", "year-label")
      .attr("x", width - margin.right)
      .attr("y", height - margin.bottom - 60)
      .attr("text-anchor", "end")
      .attr("font-size", "70px")
      .attr("fill", "#333");

    // Display Population current run time
    svg.append("text")
      .attr("class", "total-label")
      .attr("x", width - margin.right - 5)
      .attr("y", height - margin.bottom - 10)
      .attr("text-anchor", "end")
      .attr("font-size", "20px")
      .attr("fill", "#333");
    // --------------------------------------------------------------------------- : End Display Year & Population current run time

    // --------------------------------------------------------------------------- : Start Timeline 
    // Timeline
    svg.append("line")
      .attr("class", "timeline")
      .attr("x1", margin.left)
      .attr("y1", height - margin.bottom + 45)
      .attr("x2", width - margin.right)
      .attr("y2", height - margin.bottom + 45)
      .attr("stroke", "black")
      .attr("stroke-width", 1.5);

    // Main division lines are spaced 4 years apart
    svg.selectAll(".timeline-tick-line")
      .data(filteredYears)
      .join("line")
      .attr("class", "timeline-tick-line")
      .attr("x1", (d) => timelineScale(d))
      .attr("y1", height - margin.bottom + 55)
      .attr("x2", (d) => timelineScale(d))
      .attr("y2", height - margin.bottom + 45)
      .attr("stroke", "black")
      .attr("stroke-width", 1.5);

    // Subdivision lines are spaced 1 year apart
    svg.selectAll(".timeline-subtick-line")
      .data(years)
      .join("line")
      .attr("class", "timeline-subtick-line")
      .attr("x1", (d) => timelineScale(d))
      .attr("y1", height - margin.bottom + 50) // เลื่อนขึ้นเพื่อแยกจากเส้นหลัก
      .attr("x2", (d) => timelineScale(d))
      .attr("y2", height - margin.bottom + 45)
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    svg.selectAll(".timeline-tick")
      .data(filteredYears)
      .join("text")
      .attr("class", "timeline-tick")
      .attr("x", (d) => timelineScale(d))
      .attr("y", height - margin.bottom + 70)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text((d) => d);

    // Arrow
    const adjustedIndex = currentIndex - 1;
    const progressX = margin.left + (adjustedIndex / (data.length - 1)) * (width - margin.left - margin.right);
    svg.selectAll(".progress-arrow")
      .data([null])
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("class", "progress-arrow")
            .attr("x1", margin.left)
            .attr("y1", height - margin.bottom + 35)
            .attr("x2", margin.left)
            .attr("y2", height - margin.bottom + 40)
            .attr("stroke", "black")
            .attr("marker-end", "url(#arrow)"),
        (update) => update.transition().duration(duration)
      )
      .attr("x1", progressX)
      .attr("x2", progressX);

    svg.append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("refX", 5)
      .attr("refY", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,0 L10,5 L0,10 Z")
      .attr("fill", "#333");
    // --------------------------------------------------------------------------- : End Timeline 

    // --------------------------------------------------------------------------- : Start Chart
    // X and Y axes
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${margin.top})`);
    svg
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left},0)`);

    // Update the chart every time the year changes
    const timer = d3.interval(() => {
      if (isPlaying && currentIndex < data.length) {
        updateChart(data[currentIndex], width, height, margin, duration, svg, x, y, color);
        setCurrentIndex(currentIndex + 1);
      }
    }, duration);

    return () => timer.stop();
    // --------------------------------------------------------------------------- : End Chart
  }, [data, isPlaying, currentIndex]);

  return (
    <div style={{ display: "grid", justifyContent: "center" }}>
      <h1>Population growth per country 1950 to 2021</h1>
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <div
          style={{
            marginRight: -390,
            marginBottom: 28,
            zIndex: 2
          }}
        >
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              foantSize: "24px",
              border: "none",
              background: "transparent",
              cursor: "pointer"
            }}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
        </div>

        <div style={{}}>
          <svg ref={svgRef}></svg>
        </div>
      </div>
    </div>
  );
};

export default App;