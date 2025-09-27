const CategoryNews=require('../model/CategoryNews')

// obtener todas las categorias de noticias
const getAllCategoryNews=async()=>{
    const categories=await CategoryNews.getAllCategoryNews();
    return categories;
}

// crear categoria de noticias
const createCategoryNews=async(categoryName)=>{
    // validar que el nombre de la categoria no esté vacío
    if(!categoryName){
        throw new Error('El nombre de la categoría es obligatorio');
    }
    // verificar que la categoria no exista
    const existingCategories=await CategoryNews.getAllCategoryNews();
    const categoryExists=existingCategories.find(cat=>cat.category_name.toLowerCase()===categoryName.toLowerCase());
    if(categoryExists){
        throw new Error('La categoría ya existe');
    }
    // crear la categoria
    const newCategory=await CategoryNews.createCategoryNews(categoryName);
    return newCategory;


}

module.exports={
    createCategoryNews,
    getAllCategoryNews

}