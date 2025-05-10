import React, { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaEdit, FaCheck } from "react-icons/fa";

const ProductModal = ({ isOpen, onClose, onProductSelect }) => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    title: "",
    info: "",
    color: "blue",
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [error, setError] = useState("");

  const colors = ["red", "purple", "orange", "green", "blue", "white"];

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/products");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to fetch products");
    }
  };

  const validateProduct = (product) => {
    if (!product.title.trim()) {
      setError("Product title is required");
      return false;
    }
    if (!product.info.trim()) {
      setError("Product information is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const productToSave = editingProduct || newProduct;
    if (!validateProduct(productToSave)) {
      return;
    }

    try {
      const url = editingProduct
        ? `http://localhost:5000/api/products/${editingProduct.id}`
        : "http://localhost:5000/api/products";

      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: productToSave.title.trim(),
          info: productToSave.info.trim(),
          color: productToSave.color,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save product");
      }

      await fetchProducts();
      setNewProduct({ title: "", info: "", color: "blue" });
      setEditingProduct(null);
      setShowColorPicker(false);
      setError("");
    } catch (error) {
      console.error("Error saving product:", error);
      setError(error.message || "Failed to save product");
    }
  };

  const deleteProduct = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      await fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      setError("Failed to delete product");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowColorPicker(false);
    setError("");
  };

  const handleCancel = () => {
    setEditingProduct(null);
    setNewProduct({ title: "", info: "", color: "blue" });
    setShowColorPicker(false);
    setError("");
    onClose();
  };

  const ColorPicker = ({ selectedColor, onColorSelect }) => (
    <div className="absolute w-30 right-0 top-full mt-2 bg-zinc-800 p-2 rounded-lg shadow-lg border border-zinc-600 z-50">
      <div className="grid grid-cols-3 gap-2">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              onColorSelect(color);
              setShowColorPicker(false);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              selectedColor === color ? "border-white" : "border-transparent"
            }`}
            style={{ backgroundColor: `var(--${color}-500)` }}
          >
            {selectedColor === color && (
              <FaCheck className="text-white text-sm" />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-zinc-800 p-6 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl text-blue-400 mb-4">Product Management</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-4 mb-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Product Title"
                value={editingProduct?.title || newProduct.title}
                onChange={(e) =>
                  editingProduct
                    ? setEditingProduct({
                        ...editingProduct,
                        title: e.target.value,
                      })
                    : setNewProduct({ ...newProduct, title: e.target.value })
                }
                className="w-full p-2 bg-zinc-700 rounded"
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-10 h-10 rounded-full border-2 border-white"
                style={{
                  backgroundColor: `var(--${
                    editingProduct?.color || newProduct.color
                  }-500)`,
                }}
              />
              {showColorPicker && (
                <ColorPicker
                  selectedColor={editingProduct?.color || newProduct.color}
                  onColorSelect={(color) =>
                    editingProduct
                      ? setEditingProduct({ ...editingProduct, color })
                      : setNewProduct({ ...newProduct, color })
                  }
                />
              )}
            </div>
          </div>

          <textarea
            placeholder="Product Information"
            value={editingProduct?.info || newProduct.info}
            onChange={(e) =>
              editingProduct
                ? setEditingProduct({ ...editingProduct, info: e.target.value })
                : setNewProduct({ ...newProduct, info: e.target.value })
            }
            className="w-full p-2 mb-2 bg-zinc-700 rounded h-32"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-zinc-600 rounded hover:bg-zinc-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            >
              {editingProduct ? "Update" : "Add"} Product
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between bg-zinc-700 p-3 rounded border-l-4 hover:bg-zinc-600/50 transition-colors"
              style={{ borderColor: `var(--${product.color}-500)` }}
            >
              <div className="flex-1 flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: `var(--${product.color}-500)` }}
                />
                <div>
                  <h3 className="font-semibold text-blue-400">
                    {product.title}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {product.info.length > 100
                      ? `${product.info.substring(0, 100)}...`
                      : product.info}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 text-yellow-400 hover:bg-zinc-600 rounded transition-colors"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="p-2 text-red-400 hover:bg-zinc-600 rounded transition-colors"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
