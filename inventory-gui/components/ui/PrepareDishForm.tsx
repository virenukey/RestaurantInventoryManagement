import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";

const API_URL = "http://localhost:8000"; // Update if backend is on a different host/port

export default function PrepareDishForm() {
  const [dishName, setDishName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState("");
  const [dishes, setDishes] = useState([]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const res = await axios.get(`${API_URL}/dishes`);
        setDishes(res.data);
      } catch (error) {
        console.error("Failed to fetch dishes", error);
      }
    };
    fetchDishes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName || !quantity) {
      alert("Dish name and quantity are required.");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/prepare_dish`, null, {
        params: {
          dish_name: dishName,
          quantity: parseFloat(quantity),
          date: date || undefined,
        },
      });
      toast.success(res.data.message || "Dish prepared successfully!");
      setDishName("");
      setQuantity("");
      setDate("");
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Failed to prepare dish.";
      toast.error(msg);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && (selected.name.endsWith(".xlsx") || selected.name.endsWith(".xls"))) {
      setFile(selected);
      setStatus(null);
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
      const res = await axios.post(`${API_URL}/upload_prepare_dish_excel`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Upload successful!");
      setStatus("Upload successful!");
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Upload failed.";
      setStatus(`Error: ${errorMsg}`);
      toast.error(errorMsg);
    }
  };

  return (
    <Card className="max-w-xl mx-auto mt-8 p-6 shadow-lg rounded-xl bg-white">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-bold">🍽️ Prepare Dish</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Dish Name</Label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              required
            >
              <option value="">Select dish</option>
              {dishes.map((dish: any) => (
                <option key={dish.id} value={dish.name}>
                  {dish.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Quantity (Servings)</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Date (optional)</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button type="submit">Prepare</Button>
        </form>

        <div className="mt-6 pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2">📁 Upload Prepare Dish Excel</h3>
          <Input type="file" accept=".xlsx,.xls" onChange={handleChange} />
          <Button className="mt-2" onClick={handleUpload} disabled={!file}>
            Upload
          </Button>
          {status && <p className="text-sm mt-2 text-gray-700">{status}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
