import { render, screen } from "@testing-library/react";
import Tooltip from "../../src/components/Tooltip.jsx";

describe("Tooltip", function() {
  it("renders nothing when hov is null", function() {
    var result = render(<Tooltip hov={null} />);
    expect(result.container.innerHTML).toBe("");
  });

  it("renders country name and population", function() {
    render(<Tooltip hov={{ t: "c", n: "Brazil", p: 211000000 }} />);
    expect(screen.getByText("Brazil")).toBeInTheDocument();
    expect(screen.getByText("211,000,000")).toBeInTheDocument();
    expect(screen.getByText("COUNTRY")).toBeInTheDocument();
  });

  it("renders city badge for city type", function() {
    render(<Tooltip hov={{ t: "city", n: "Tokyo", p: 13960000 }} />);
    expect(screen.getByText("CITY")).toBeInTheDocument();
  });

  it("renders STATE badge for subdivision", function() {
    render(<Tooltip hov={{ t: "s", n: "California", p: 39000000, parentIso: "USA" }} />);
    expect(screen.getByText("STATE")).toBeInTheDocument();
  });

  it("renders COUNTY badge for county type", function() {
    render(<Tooltip hov={{ t: "county", n: "Harris", p: 5009302 }} />);
    expect(screen.getByText("COUNTY")).toBeInTheDocument();
  });

  it("displays region when provided", function() {
    render(<Tooltip hov={{ t: "c", n: "Test", p: 1000000, rg: "West" }} />);
    expect(screen.getByText(/West/)).toBeInTheDocument();
  });

  it("displays region and capital together", function() {
    render(<Tooltip hov={{ t: "s", n: "Test", p: 1000000, rg: "West", cp: "Capital City" }} />);
    expect(screen.getByText(/Capital City/)).toBeInTheDocument();
  });

  it("has tooltip role for accessibility", function() {
    render(<Tooltip hov={{ t: "c", n: "Test", p: 1000 }} />);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("handles zero population", function() {
    render(<Tooltip hov={{ t: "c", n: "Test", p: 0 }} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
