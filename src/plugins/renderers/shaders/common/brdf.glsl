//=============================================================================
// BRDF FUNCTIONS - Cook-Torrance Microfacet Model
//=============================================================================

/**
 * GGX/Trowbridge-Reitz Normal Distribution Function (D)
 *
 * Describes the statistical distribution of microfacet normals.
 * GGX has a longer tail than Beckmann, giving more realistic highlights.
 *
 * @param NdotH - Dot product of normal and half-vector
 * @param roughness - Material roughness (0 = smooth, 1 = rough)
 * @return Distribution value
 */
float distributionGGX(float NdotH, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH2 = NdotH * NdotH;

  float denom = NdotH2 * (a2 - 1.0) + 1.0;
  denom = PI * denom * denom;

  return a2 / max(denom, 0.0001);
}

/**
 * Smith-GGX Geometry Function - Single direction (G1)
 *
 * Accounts for microfacet self-shadowing. Uses the correlated
 * Smith approximation which is more accurate than separable.
 *
 * @param NdotV - Dot product of normal and view/light direction
 * @param roughness - Material roughness
 * @return Geometry term for single direction
 */
float geometrySchlickGGX(float NdotV, float roughness) {
  // Remap roughness for direct lighting (different from IBL)
  float r = roughness + 1.0;
  float k = (r * r) / 8.0;

  return NdotV / (NdotV * (1.0 - k) + k);
}

/**
 * Smith Geometry Function (G) - Combined shadowing and masking
 *
 * Combines geometry terms for both view and light directions.
 *
 * @param NdotV - Dot product of normal and view direction
 * @param NdotL - Dot product of normal and light direction
 * @param roughness - Material roughness
 * @return Combined geometry term
 */
float geometrySmith(float NdotV, float NdotL, float roughness) {
  float ggx1 = geometrySchlickGGX(NdotV, roughness);
  float ggx2 = geometrySchlickGGX(NdotL, roughness);
  return ggx1 * ggx2;
}

/**
 * Fresnel-Schlick Approximation (F)
 *
 * Approximates the Fresnel equations for reflectance at different angles.
 * At grazing angles, all materials become more reflective.
 *
 * @param cosTheta - Cosine of angle between view and half-vector
 * @param F0 - Reflectance at normal incidence
 * @return Fresnel reflectance
 */
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(saturate(1.0 - cosTheta), 5.0);
}

/**
 * Fresnel-Schlick with roughness (for IBL/ambient)
 *
 * Modified Fresnel that accounts for roughness in ambient lighting.
 * Rougher surfaces have less pronounced Fresnel effect.
 *
 * @param cosTheta - Cosine of angle
 * @param F0 - Reflectance at normal incidence
 * @param roughness - Material roughness
 * @return Fresnel reflectance
 */
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(saturate(1.0 - cosTheta), 5.0);
}

/**
 * Calculate F0 (reflectance at normal incidence)
 *
 * For dielectrics, F0 is around 0.04 (4% reflectance).
 * For metals, F0 is the albedo color.
 * Metallic parameter blends between these.
 *
 * @param albedo - Base color
 * @param metallic - Metallic factor (0 = dielectric, 1 = metal)
 * @return F0 reflectance value
 */
vec3 calculateF0(vec3 albedo, float metallic) {
  vec3 dielectricF0 = vec3(0.04);
  return mix(dielectricF0, albedo, metallic);
}

/**
 * Cook-Torrance Specular BRDF
 *
 * Combines D, G, F terms into the full specular BRDF.
 * Denominator includes normalization factor.
 *
 * @param D - Normal distribution term
 * @param G - Geometry term
 * @param F - Fresnel term
 * @param NdotV - Normal dot view
 * @param NdotL - Normal dot light
 * @return Specular BRDF contribution
 */
vec3 cookTorranceSpecular(float D, float G, vec3 F, float NdotV, float NdotL) {
  vec3 numerator = D * G * F;
  float denominator = 4.0 * max(NdotV, 0.001) * max(NdotL, 0.001);
  return numerator / denominator;
}

/**
 * Lambertian Diffuse BRDF
 *
 * Simple diffuse model. Energy-conserving when combined with specular.
 *
 * @param albedo - Base color
 * @return Diffuse BRDF (albedo / PI)
 */
vec3 lambertianDiffuse(vec3 albedo) {
  return albedo * INV_PI;
}
