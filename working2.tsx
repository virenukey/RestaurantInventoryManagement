'use client'

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_URL = "http://localhost:8000";

export default function InventoryApp() {
  const [inventory, setInventory] = useState([]);
  const [newItem, setNewItem] = useState({
  name: "",
  quantity: "",
  unit: "",
  price_per_unit: "",
  total_cost: "",
  type: "",
  date_added: "",
});
  const [dishId, setDishId] = useState("");
  const [dishQty, setDishQty] = useState("");
  const [report, setReport] = useState(null);
  const [date, setDate] = useState("");
  const [dateInventory, setDateInventory] = useState([]);
  const [reportRange, setReportRange] = useState({ start: "", end: "" });
  const [dishes, setDishes] = useState([]);
  const [dishTypes, setDishTypes] = useState([]);
  const [newDish, setNewDish] = useState({ name: "", type_id: "" });
  const [newDishType, setNewDishType] = useState("");
  const [dishIngredients, setDishIngredients] = useState([]);
  const [ingredientLink, setIngredientLink] = useState({ dish_id: "", ingredient_id: "", quantity_required: "" });
  const [searchParams, setSearchParams] = useState({ name: "", start_date: "", end_date: "" });
  const [searchResults, setSearchResults] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedInventoryName, setSelectedInventoryName] = useState("");
  const unitOptions = ["kg", "gm", "litre", "ml", "piece", "pack", "bottle", "single"];
  const quantityOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
 "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
 "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
 "31", "32", "33", "34", "35", "36", "37", "38", "39", "40",
 "41", "42", "43", "44", "45", "46", "47", "48", "49", "50",
 "51", "52", "53", "54", "55", "56", "57", "58", "59", "60",
 "61", "62", "63", "64", "65", "66", "67", "68", "69", "70",
 "71", "72", "73", "74", "75", "76", "77", "78", "79", "80",
 "81", "82", "83", "84", "85", "86", "87", "88", "89", "90",
 "91", "92", "93", "94", "95", "96", "97", "98", "99", "100"];
 const [showInventory, setShowInventory] = useState(false);

 const typeOptions = ["Oil", "Vegetables", "Spices", "Bun", "Pizza base", "Sauses", "Grains",
     "Dairy", "Non-Veg", "Maintanance", "Misc", "Grocery", "Cleaning", "Crockery", "Cutlery",
     "Beverages", "Tableware", "Linens", "Disposables", "Dry fruits", "Fruits", "Chocolates", "Bakery", "Cooking Gas"];

 const [searchQuery, setSearchQuery] =  useState("");
 const [startDate, setStartDate] = useState("");
 const [endDate, setEndDate] = useState("");
 const [file, setFile] = useState<File | null>(null);
 const [details, setDetails] = useState<{
  added_items: string[];
  updated_items: string[];
  skipped_rows: string[];
} | null>(null);

 const [status, setStatus] = useState<string | null>(null);







  const fetchInventory = async () => {
  try {
    const res = await axios.get(`${API_URL}/inventory`);
    setInventory(res.data);

    // Optional: Print inventory in console as a table
    console.table(res.data);
  } catch (error) {
    console.error("Error fetching inventory:", error);
  }
};

  const fetchDishes = async () => {
    const res = await axios.get(`${API_URL}/dishes`);
    setDishes(res.data);
  };

  const fetchDishTypes = async () => {
    const res = await axios.get(`${API_URL}/dish_types`);
    setDishTypes(res.data);
  };

  const fetchDishIngredients = async () => {
    const res = await axios.get(`${API_URL}/dish_ingredients`);
    setDishIngredients(res.data);
  };

  const handleUpdate = (item) => {
  setSelectedItem({ ...item });  // clone to avoid mutation
  setShowUpdateForm(true);
  };


  const handleUpdateSubmit = async () => {
    if (!selectedItem) return;

    const {
      id,
      name,
      quantity,
      unit,
      price_per_unit,
      total_cost,
      type,
      date_added,
    } = selectedItem;

    if (!name || !quantity || !unit) {
      alert("Please fill in required fields.");
      return;
    }

    const params = new URLSearchParams({
      name,
      quantity: quantity.toString(),
      unit,
    });

    if (price_per_unit) params.append("price_per_unit", price_per_unit.toString());
    if (total_cost) params.append("total_cost", total_cost.toString());
    if (type) params.append("type", type);
    if (date_added) params.append("date_added", date_added);

    try {
      const response = await fetch(`${API_URL}/update_item/${id}?${params}`, {
        method: "PUT",
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setInventory(data.current_inventory);
        setShowUpdateForm(false);
        setSelectedItem(null);
      } else {
        alert(data.detail || "Failed to update item.");
      }
    } catch (error) {
      console.error("Error updating item:", error);
      alert("An error occurred.");
    }
  };

  const handleDownload = async () => {
  try {
    const res = await axios.get(`${API_URL}/search_inventory`, {
      params: {
        name: searchParams.name || undefined,
        start_date: searchParams.start_date || undefined,
        end_date: searchParams.end_date || undefined,
      },
    });
    const data = res.data;

    if (!Array.isArray(data) || data.length === 0) {
      alert("No data to export.");
      return;
    }

    const csvHeader = [
      "ID", "Name", "Quantity", "Unit", "Price per Unit",
      "Total Cost", "Type", "Date Added"
    ];

    const csvRows = data.map(item =>
      [
        item.id,
        item.name,
        item.quantity,
        item.unit,
        item.price_per_unit,
        item.total_cost,
        item.type,
        item.date_added,
      ]
    );

    const csvContent = [
      csvHeader.join(","),
      ...csvRows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "inventory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed:", error);
  }
};





  useEffect(() => {
    fetchInventory();

  }, []);


  const handleAddItem = async () => {
  const { name, quantity, unit, price_per_unit, total_cost, type, date_added } = newItem;

  // Build params conditionally
  const params = {
    name,
    quantity: parseFloat(quantity),
    unit,
    date_added,
  };

  if (price_per_unit) {
    params.price_per_unit = parseFloat(price_per_unit);
  } else if (total_cost) {
    params.total_cost = parseFloat(total_cost);
  } else {
    alert("Please provide either Price per Unit or Total Cost.");
    return;
  }

  if (type) {
      params.type = type;
    }

  try {
    const response = await axios.post(`${API_URL}/add_item`, null, { params });
    console.log("Item added successfully:", response.data);
    setNewItem({
      name: "",
      quantity: "",
      unit: "",
      price_per_unit: "",
      total_cost: "",
      type: "",
      date_added: "",
    });
    fetchInventory();
  } catch (error) {
    console.error("Error adding item:", error);
    alert("Failed to add item. Check input values.");
  }
  };

  const handleSearchInventory = async () => {
  try {
    const res = await axios.get(`${API_URL}/search_inventory`, {
      params: {
        name: searchParams.name || undefined,
        start_date: searchParams.start_date || undefined,
        end_date: searchParams.end_date || undefined,
      },
    });
    setSearchResults(res.data);
  } catch (error) {
    console.error("Search inventory failed:", error);
    alert("Failed to search inventory. Check filters.");
  }
};


  const handlePrepareDish = async () => {
    await axios.post(`${API_URL}/prepare_dish`, null, {
      params: {
        dish_id: parseInt(dishId),
        quantity: parseFloat(dishQty),
      },
    });
    fetchInventory();
  };

  const handleInventoryOnDate = async () => {
    const res = await axios.get(`${API_URL}/inventory_on_date`, { params: { date } });
    setDateInventory(res.data);
  };

  const handleExpenseReport = async () => {
    try {
      const params = {};
      if (reportRange.start) params.start_date = reportRange.start;
      if (reportRange.end) params.end_date = reportRange.end;
      if (selectedInventoryName) params.inventory_name = selectedInventoryName;
      const res = await axios.get(`${API_URL}/expense_report`, { params });

      setReport(res.data);
    } catch (error) {
      console.error("Expense report error:", error);
      alert("Failed to fetch expense report.");
    }
  };




  const handleAddDish = async () => {
    await axios.post(`${API_URL}/add_dish`, null, {
      params: newDish,
    });
    setNewDish({ name: "", type_id: "" });
    fetchDishes();
  };

  const handleAddDishType = async () => {
    await axios.post(`${API_URL}/add_dish_type`, null, {
      params: { name: newDishType },
    });
    setNewDishType("");
    fetchDishTypes();
  };

  const handleLinkIngredient = async () => {
    await axios.post(`${API_URL}/link_ingredient`, null, {
      params: ingredientLink,
    });
    setIngredientLink({ dish_id: "", ingredient_id: "", quantity_required: "" });
    fetchDishIngredients();
  };

  const handleDelete = async (id) => {
  if (!window.confirm("Are you sure you want to delete this item?")) return;

  try {
    const response = await fetch(`http://localhost:8000/delete_item/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();
    alert(data.message);
    fetchInventory(); // refresh list
  } catch (error) {
    alert("Failed to delete item");
  }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && (selected.name.endsWith(".xlsx") || selected.name.endsWith(".xls"))) {
      setFile(selected);
      setStatus(null);
      setDetails(null);
    } else {
      setStatus("Please upload a valid Excel file (.xlsx or .xls)");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus("No file selected.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatus("Uploading...");
      const res = await axios.post(`${API_URL}/upload_inventory_excel`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setStatus("Upload successful!");
      setDetails(res.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Upload failed.";
      setStatus(`Error: ${errorMsg}`);
    }
  };


  return (
   <div
      className="p-4 space-y-6 min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: "url('/logo.png')",
        backgroundColor: "#808080"
      }}
    >
    <div className="flex justify-center">
      <img src="/vibes-logo.png" alt="Logo" className="h-26 mb-4" />
    </div>
       <Card className="bg-gradient-to-br from-yellow-200 to-white shadow-lg rounded-lg">
        <CardContent className="space-y-2">
          <h2 className="text-xl font-bold">Add Inventory Item</h2>
          <div className="grid grid-cols-2 gap-2">
            {/* Dynamically render fields except "type" */}
            {Object.keys(newItem).map((key) =>
              key !== "type" ? (
                <div key={key}>
                  <Label>{key.replace("_", " ")}</Label>
                  {key === "quantity" ? (
                    <select
                      className="w-50 border rounded px-2 py-1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    >
                      <option value="">Select quantity</option>
                      {quantityOptions.map((qty) => (
                        <option key={qty} value={qty}>{qty}</option>
                      ))}
                    </select>
                  ) : key === "unit" ? (
                    <select
                      className="w-50 border rounded px-2 py-1"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    >
                      <option value="">Select unit</option>
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      className="w-50 border rounded px-2 py-1"
                      type={key === "date_added" ? "date" : "text"}
                      value={newItem[key]}
                      onChange={(e) => setNewItem({ ...newItem, [key]: e.target.value })}
                    />
                  )}
                </div>
              ) : null
            )}

            {/* Manually add "type" field just once */}
            <div>
              <Label>Type (Optional)</Label>
              <select
                className="w-50 border rounded px-2 py-1"
                value={newItem.type}
                onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
              >
                <option value="">Select type</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-2">
            <Button onClick={handleAddItem}>Add Item</Button>
          </div>
        </CardContent>
      </Card>


      <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>📦 Upload Inventory Excel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input type="file" accept=".xlsx,.xls" onChange={handleChange} />
        <Button onClick={handleUpload} disabled={!file}>
          Upload
        </Button>
        {status && <p className="text-sm text-gray-700">{status}</p>}
        {details && (
          <div className="text-sm bg-gray-50 p-3 rounded border space-y-2">
            <div>
              <strong>✅ Added:</strong>{" "}
              {details.added_items.length > 0 ? details.added_items.join(", ") : "None"}
            </div>
            <div>
              <strong>♻️ Updated:</strong>{" "}
              {details.updated_items.length > 0 ? details.updated_items.join(", ") : "None"}
            </div>
            {details.skipped_rows.length > 0 && (
              <div>
                <strong>⚠️ Skipped Rows:</strong>
                <ul className="list-disc pl-5">
                  {details.skipped_rows.map((row, idx) => (
                    <li key={idx}>{row}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>




    <Card className="bg-gradient-to-br from-yellow-200 to-white shadow-lg rounded-lg">


  <CardContent className="space-y-2">
    <h2 className="text-xl font-bold">Search Inventory</h2>
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label>Name</Label>
        <Input
          className="w-50 border rounded px-2 py-1"
          value={searchParams.name}
          onChange={(e) => setSearchParams({ ...searchParams, name: e.target.value })}
        />
      </div>
      <div>
        <Label>Start Date</Label>
        <Input
          className="w-50 border rounded px-2 py-1"
          type="date"
          value={searchParams.start_date}
          onChange={(e) => setSearchParams({ ...searchParams, start_date: e.target.value })}
        />
      </div>
      <div>
        <Label>End Date</Label>
        <Input
          className="w-50 border rounded px-2 py-1"
          type="date"
          value={searchParams.end_date}
          onChange={(e) => setSearchParams({ ...searchParams, end_date: e.target.value })}
        />
      </div>
    </div>
    <Button onClick={handleSearchInventory}>Search</Button>
    <Button variant="outline" onClick={handleDownload}>Download CSV</Button>

    {searchResults.length > 0 && (
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full table-auto border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">ID</th>
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Quantity</th>
              <th className="px-4 py-2 border">Unit</th>
              <th className="px-4 py-2 border">Price/Unit</th>
              <th className="px-4 py-2 border">Total Cost</th>
              <th className="px-4 py-2 border">Type</th>
              <th className="px-4 py-2 border">Date Added</th>
            </tr>
          </thead>
          <tbody>
            {searchResults.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 border">{item.id}</td>
                <td className="px-4 py-2 border">{item.name}</td>
                <td className="px-4 py-2 border">{item.quantity}</td>
                <td className="px-4 py-2 border">{item.unit}</td>
                <td className="px-4 py-2 border">{item.price_per_unit}</td>
                <td className="px-4 py-2 border">{item.total_cost}</td>
                 <td className="px-4 py-2 border">{item.type}</td>
                <td className="px-4 py-2 border">{item.date_added}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>



   {showUpdateForm && selectedItem && (
        <Card className="bg-gradient-to-br from-yellow-200 to-gray-100 shadow-lg rounded-lg">
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Update Inventory Item</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedItem).map(([key, value]) =>
                key !== "id" && key !== "date_added" && key !== "type" && key !== "unit" ? (
                  <div key={key}>
                    <Label>{key.replace("_", " ")}</Label>
                    <Input
                      className="w-50 border rounded px-2 py-1"
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setSelectedItem({ ...selectedItem, [key]: e.target.value })
                      }
                    />
                  </div>
                ) : null
              )}
              <div>
                <Label>Unit</Label>
                <select
                  className="w-50 border rounded px-2 py-1"
                  value={selectedItem.unit || ""}
                  onChange={(e) => setSelectedItem({ ...selectedItem, unit: e.target.value })}
                >
                  <option value="">Select unit</option>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-50 border rounded px-2 py-1"
                  value={selectedItem.type || ""}
                  onChange={(e) => setSelectedItem({ ...selectedItem, type: e.target.value })}
                >
                  <option value="">Select type</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Date Added</Label>
                <Input
                  className="w-50 border rounded px-2 py-1"
                  type="date"
                  value={selectedItem.date_added?.split("T")[0] || ""}
                  onChange={(e) =>
                    setSelectedItem({
                      ...selectedItem,
                      date_added: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleUpdateSubmit}>Submit Update</Button>
              <Button variant="secondary" onClick={() => setShowUpdateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}




     <Card className="bg-gradient-to-br from-yellow-200 to-white shadow-lg rounded-lg">
  <CardContent>
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-xl font-bold">Inventory</h2>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowInventory(!showInventory)}>{showInventory ? "Hide" : "Show"}
      </Button>
    </div>

    {showInventory && (
      <div className="overflow-x-auto transition-all duration-300">
        <table className="min-w-full table-auto border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">ID</th>
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Quantity</th>
              <th className="px-4 py-2 border">Unit</th>
              <th className="px-4 py-2 border">Price/Unit</th>
              <th className="px-4 py-2 border">Total Cost</th>
              <th className="px-4 py-2 border">Type</th>
              <th className="px-4 py-2 border">Date Added</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 border">{item.id}</td>
                <td className="px-4 py-2 border">{item.name}</td>
                <td className="px-4 py-2 border">{item.quantity}</td>
                <td className="px-4 py-2 border">{item.unit}</td>
                <td className="px-4 py-2 border">{item.price_per_unit}</td>
                <td className="px-4 py-2 border">{item.total_cost}</td>
                <td className="px-4 py-2 border">{item.type}</td>
                <td className="px-4 py-2 border">{item.date_added}</td>
                <td className="px-4 py-2 border space-x-1">
                  <button
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                    onClick={() => handleUpdate(item)}
                  >
                    Update
                  </button>
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>



      <Card className="bg-gradient-to-br from-yellow-200 to-white shadow-lg rounded-lg">
        <CardContent>
          <h2 className="text-xl font-bold">Inventory On Date</h2>
          <Input className="w-50 border rounded px-2 py-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button onClick={handleInventoryOnDate}>Fetch</Button>
          <ul>
            {dateInventory.map((log, index) => (
              <li key={index}>
                Ingredient ID: {log.ingredient_id}, Quantity Left: {log.quantity_left}, Date: {log.date}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
<Card className="bg-gradient-to-br from-yellow-200 to-gray-100 shadow-lg rounded-lg">
        <CardContent>
          <h2 className="text-xl font-bold mb-4">Expense Report</h2>
          <Label>Start Date</Label>
          <Input
            type="date"
            className="w-50 border rounded px-2 py-1"
            value={reportRange.start}
            onChange={(e) => setReportRange({ ...reportRange, start: e.target.value })}
          />
          <Label>End Date</Label>
          <Input
            type="date"
            className="w-50 border rounded px-2 py-1"
            value={reportRange.end}
            onChange={(e) => setReportRange({ ...reportRange, end: e.target.value })}
          />
          <Label className="mt-2">Inventory Name (Optional)</Label>
          <Input
            type="text"
            className="w-50 border rounded px-2 py-1"
            placeholder="Enter item name"
            value={selectedInventoryName}
            onChange={(e) => setSelectedInventoryName(e.target.value)}
          />
          <Button className="mt-2" onClick={handleExpenseReport}>Get Report</Button>
          {report && (
            <div className="mt-4 space-y-1">
            <p><strong>Inventory Name:</strong> {report.inventory_name}</p>
              <p><strong>Total Expense:</strong> {report.total_expense}</p>
              <p><strong>Average Expense:</strong> {report.average_expense}</p>
              {selectedInventoryName ? (
                <>
                  <p><strong>Highest Expense:</strong> {report.highest_expense_day.amount}</p>
                  <p><strong>Lowest Expense:</strong> {report.lowest_expense_day.amount}</p>
                  <p><strong>Highest Expense Date:</strong> {report.highest_expense_day.date}</p>
                  <p><strong>Lowest Expense Date:</strong> {report.lowest_expense_day.date}</p>
                </>
              ) : (
      <>
        {/* Render alternative report when no inventory is selected */}
        <p className="text-gray-500">No specific inventory selected.</p>
        <p><strong>Highest Expense Inventory:</strong> {report.highest_expense}</p>
        <p><strong>Overall Lowest Expense:</strong> {report.lowest_expense}</p>
        {/* Add more fields as needed */}
      </>
              )}
            </div>
          )}
        </CardContent>
      </Card>





    </div>
  );
}
