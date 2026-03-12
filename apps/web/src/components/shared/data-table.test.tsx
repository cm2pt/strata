import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable } from "./data-table";

interface TestItem {
  id: string;
  name: string;
  value: number;
}

const columns = [
  { key: "name", header: "Name", render: (item: TestItem) => item.name },
  { key: "value", header: "Value", render: (item: TestItem) => `$${item.value}` },
];

const sampleData: TestItem[] = [
  { id: "1", name: "Alpha", value: 100 },
  { id: "2", name: "Beta", value: 200 },
  { id: "3", name: "Gamma", value: 300 },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(
      <DataTable columns={columns} data={sampleData} keyExtractor={(i) => i.id} />,
    );
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Value")).toBeTruthy();
  });

  it("renders all data rows", () => {
    render(
      <DataTable columns={columns} data={sampleData} keyExtractor={(i) => i.id} />,
    );
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Gamma")).toBeTruthy();
  });

  it("renders cell values using render function", () => {
    render(
      <DataTable columns={columns} data={sampleData} keyExtractor={(i) => i.id} />,
    );
    expect(screen.getByText("$100")).toBeTruthy();
    expect(screen.getByText("$200")).toBeTruthy();
    expect(screen.getByText("$300")).toBeTruthy();
  });

  it("shows default empty message when data is empty", () => {
    render(
      <DataTable columns={columns} data={[]} keyExtractor={(i: TestItem) => i.id} />,
    );
    expect(screen.getByText("No data available")).toBeTruthy();
  });

  it("shows custom empty message when provided", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(i: TestItem) => i.id}
        emptyMessage="Nothing to display"
      />,
    );
    expect(screen.getByText("Nothing to display")).toBeTruthy();
  });

  it("does not render a table when data is empty", () => {
    const { container } = render(
      <DataTable columns={columns} data={[]} keyExtractor={(i: TestItem) => i.id} />,
    );
    expect(container.querySelector("table")).toBeNull();
  });

  it("calls onRowClick when a row is clicked", () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={sampleData}
        keyExtractor={(i) => i.id}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByText("Alpha"));
    expect(onRowClick).toHaveBeenCalledWith(sampleData[0]);
  });

  it("does not crash when onRowClick is not provided and row is clicked", () => {
    render(
      <DataTable columns={columns} data={sampleData} keyExtractor={(i) => i.id} />,
    );
    // Should not throw
    fireEvent.click(screen.getByText("Alpha"));
  });

  it("renders the correct number of rows", () => {
    const { container } = render(
      <DataTable columns={columns} data={sampleData} keyExtractor={(i) => i.id} />,
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(3);
  });

  it("applies className prop to the container", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={sampleData}
        keyExtractor={(i) => i.id}
        className="custom-class"
      />,
    );
    expect(container.firstElementChild?.classList.contains("custom-class")).toBe(true);
  });
});
