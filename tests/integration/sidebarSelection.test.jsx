import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/CesiumGlobe.jsx", function() {
  return {
    default: function MockCesiumGlobe() { return <div data-testid="cesium-globe" />; },
    markerSize: vi.fn(),
    getEntryHeight: vi.fn(),
    getPickedEntry: vi.fn(),
  };
});

import App from "../../src/App.jsx";

describe("Sidebar selection flow", function() {
  it("shows selection details when a country in the list is clicked", async function() {
    render(<App />);
    // Wait for sidebar content to render
    await screen.findByText("Population Globe");
    // Find India (should be in the list as it has highest/near-highest population)
    var items = screen.getAllByText("India");
    if (items.length > 0) {
      await userEvent.click(items[0]);
      // Should show detail panel
      expect(screen.getByText("COUNTRY")).toBeInTheDocument();
    }
  });
});
