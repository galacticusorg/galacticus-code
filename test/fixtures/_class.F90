!! A cut-down stand-in for a functionClass base-class source file. Kept valid
!! against the Galacticus directive schema so that the repository's XML-fragment
!! check passes; only <name> matters to the command under test.
  !![
  <functionClass docformat="rst">
   <name>exampleFamily</name>
   <descriptiveName>Example Family</descriptiveName>
   <description>
   A family that exists only so that the extension's tests have something to resolve.
   </description>
   <default>workedExample</default>
   <method name="value" >
    <description>
    Returns nothing in particular.
    </description>
    <type>double precision</type>
    <pass>yes</pass>
   </method>
  </functionClass>
  !!]
module Example_Family
end module Example_Family
