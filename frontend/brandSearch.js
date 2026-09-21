const searchInput = document.getElementById("searchBrand");
const brandForm = document.getElementById("brandForm");
const brandIdInput = document.getElementById("brandId");
const brandNameInput = document.getElementById("brandName");
const brandDescriptionInput = document.getElementById("brandDescription");
const brandImageInput = document.getElementById("brandImage");
const brandSubmit = document.getElementById("brandSubmit");
const cancelEdit = document.getElementById("cancelEdit");
const brandsContainer = document.querySelector(".brands");
const storageKey = "steppi-brands";

const defaultBrands = [
    { name: "Bata", description: "Comfortable footwear for everyday use.", image: "images/bata.png" },
    { name: "Campus", description: "Affordable and stylish sports shoes.", image: "images/campus.png" },
    { name: "Nike", description: "Premium sports and lifestyle footwear.", image: "images/nike.jpg" },
    { name: "Adidas", description: "Innovative shoes with modern designs.", image: "images/adidas.png" },
    { name: "Puma", description: "Trendy shoes for sports and fashion.", image: "images/puma.png" },
    { name: "Skechers", description: "Known for comfort and walking shoes.", image: "images/skechers.png" }
];

let brands = JSON.parse(localStorage.getItem(storageKey)) || defaultBrands.map((brand) => ({
    ...brand,
    id: crypto.randomUUID()
}));

localStorage.setItem(storageKey, JSON.stringify(brands));

function saveBrands() {
    localStorage.setItem(storageKey, JSON.stringify(brands));
}

function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        "\"": "&quot;"
    }[character]));
}

function renderBrands() {
    const searchValue = searchInput.value.trim().toLowerCase();

    brandsContainer.innerHTML = brands
        .filter((brand) => brand.name.toLowerCase().includes(searchValue))
        .map((brand) => `
            <article class="brand-card">
                <img src="${escapeHtml(brand.image || "images/logo.png")}" alt="${escapeHtml(brand.name)} Shoes">
                <h2>${escapeHtml(brand.name)}</h2>
                <p>${escapeHtml(brand.description)}</p>
                <div class="brand-actions">
                    <button type="button" class="edit-brand" data-id="${brand.id}">Edit</button>
                    <button type="button" class="delete-brand" data-id="${brand.id}">Delete</button>
                </div>
            </article>
        `)
        .join("");
}

function resetForm() {
    brandForm.reset();
    brandIdInput.value = "";
    brandSubmit.textContent = "Add Brand";
    cancelEdit.hidden = true;
}

brandForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const brandData = {
        name: brandNameInput.value.trim(),
        description: brandDescriptionInput.value.trim(),
        image: brandImageInput.value.trim() || "images/logo.png"
    };

    if (brandIdInput.value) {
        brands = brands.map((brand) => brand.id === brandIdInput.value
            ? { ...brand, ...brandData }
            : brand
        );
    } else {
        brands.push({ ...brandData, id: crypto.randomUUID() });
    }

    saveBrands();
    resetForm();
    renderBrands();
});

brandsContainer.addEventListener("click", (event) => {
    const brandId = event.target.dataset.id;

    if (event.target.classList.contains("delete-brand")) {
        if (!confirm("Are you sure you want to delete this brand?")) {
            return;
        }

        brands = brands.filter((brand) => brand.id !== brandId);
        saveBrands();
        renderBrands();
    }

    if (event.target.classList.contains("edit-brand")) {
        const brand = brands.find((item) => item.id === brandId);

        brandIdInput.value = brand.id;
        brandNameInput.value = brand.name;
        brandDescriptionInput.value = brand.description;
        brandImageInput.value = brand.image;
        brandSubmit.textContent = "Update Brand";
        cancelEdit.hidden = false;
        brandNameInput.focus();
    }
});

cancelEdit.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderBrands);

renderBrands();