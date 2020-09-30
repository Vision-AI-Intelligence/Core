const xmlHelper = require("../../src/misc/XmlHelpers");

describe("XML Helpers", function () {
  it("Get children by its tag", function () {
    let input = `
        <annotation>
            <folder>GeneratedData_Train</folder>
            <filename>000001.png</filename>
            <filename>000002.png</filename>
            <path>/my/path/GeneratedData_Train/000001.png</path>
        </annotation>
        `;
    let children = xmlHelper.getChildrenByTag(input, "filename");
    expect(children.length).toBe(2);
    expect(children[0]).toBe("000001.png");
    expect(children[1]).toBe("000002.png");
  });
  it("Get children in children by its tag", function () {
    let input = `
        <annotation>
            <object>
                <name>ABC</name>
                <pose>Frontal</pose>
                <truncated>0</truncated>
                <difficult>0</difficult>
                <occluded>0</occluded>
                <bndbox>
                    <xmin>82</xmin>
                    <xmax>172</xmax>
                    <ymin>88</ymin>
                    <ymax>146</ymax>
                </bndbox>
            </object>
            <object>
                <name>CDE</name>
                <pose>Frontal</pose>
                <truncated>0</truncated>
                <difficult>0</difficult>
                <occluded>0</occluded>
                <bndbox>
                    <xmin>82</xmin>
                    <xmax>172</xmax>
                    <ymin>88</ymin>
                    <ymax>146</ymax>
                </bndbox>
            </object>
        </annotation>
        `;
    let children = xmlHelper.getChildrenByTag(input, "object");
    expect(children.length).toBe(2);
    let childenOfChildren = xmlHelper.getChildrenByTag(children[0], "name");
    expect(childenOfChildren[0]).toBe("ABC");
    childenOfChildren = xmlHelper.getChildrenByTag(children[1], "name");
    expect(childenOfChildren[0]).toBe("CDE");
  });
});
