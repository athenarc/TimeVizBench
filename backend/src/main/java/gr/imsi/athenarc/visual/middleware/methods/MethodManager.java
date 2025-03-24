package gr.imsi.athenarc.visual.middleware.methods;
import java.lang.reflect.Constructor;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.reflections.Reflections;

import gr.imsi.athenarc.visual.middleware.datasource.DataSource;
import gr.imsi.athenarc.visual.middleware.methods.annotations.VisualMethod;

public class MethodManager {
    private static final ConcurrentHashMap<String, Method> methodInstances = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, Class<?>> methodClasses = new ConcurrentHashMap<>();
    
    static {
        // Scan for classes with @VisualMethod annotation
        Reflections reflections = new Reflections("gr.imsi.athenarc.visual.middleware.methods");
        Set<Class<?>> foundMethodClasses = reflections.getTypesAnnotatedWith(VisualMethod.class);
        
        // Register found methods
        for (Class<?> methodClass : foundMethodClasses) {
            VisualMethod annotation = methodClass.getAnnotation(VisualMethod.class);
            methodClasses.put(annotation.name(), methodClass);
        }
    }

    public static Method getOrInitializeMethod(String methodKey, DataSource dataSource, Map<String, String> params) {
        String key = generateKey(methodKey, dataSource.getDataset().getId());
        String methodName = methodKey.split("-")[0];
        
        return methodInstances.computeIfAbsent(key, k -> {
            try {
                Class<?> methodClass = methodClasses.get(methodName);
                if (methodClass == null) {
                    throw new IllegalArgumentException("Unsupported method: " + methodName);
                }
                
                Constructor<?> constructor = methodClass.getDeclaredConstructor();
                Method method = (Method) constructor.newInstance();
                method.initialize(dataSource, params);
                return method;
            } catch (Exception e) {
                throw new RuntimeException("Failed to initialize method: " + methodName, e);
            }
        });
    }

    // Helper method to generate a unique key for each method
    private static String generateKey(String methodName, String datasetId) {
        return methodName + "-" + datasetId;
    }

    // Optionally, clear method instances (e.g., for cleanup or eviction)
    public static void clearMethod(String methodName, String datasetId) {
        String key = generateKey(methodName, datasetId);
        methodInstances.remove(key);
    }

    public static void clearAll() {
        methodInstances.clear();
    }
}
