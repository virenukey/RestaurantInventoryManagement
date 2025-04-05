const updatedItem = {
    name: updatedName,
    quantity: parseFloat(updatedQuantity),
    unit: updatedUnit,
    price_per_unit: parseFloat(updatedPrice),
  };

  try {
    const response = await fetch(`http://localhost:8000/update_item/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedItem),
    });

    const data = await response.json();
    alert(data.message);
    fetchInventory(); // refresh list
  } catch (error) {
    alert("Failed to update item");
  }
};

<button className="bg-yellow-500 text-white px-2 py-1 rounded mr-2" onClick={() => handleUpdate(item)}>Update</button>